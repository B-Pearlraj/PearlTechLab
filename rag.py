"""Neon (pgvector) + embeddings helpers: chunking, storing, searching."""
import io, os, re
import numpy as np
import psycopg
from pgvector.psycopg import register_vector
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]
EMBED_MODEL = "BAAI/bge-small-en-v1.5"   # 384 dims, runs locally, no API key needed

_model = None
def _get_model():
    global _model
    if _model is None:
        from fastembed import TextEmbedding
        _model = TextEmbedding(EMBED_MODEL, threads=1)   # 1 thread = lower RAM on small servers
    return _model

def embed_docs(texts):
    return [np.asarray(v, dtype=np.float32) for v in _get_model().embed(texts)]

def embed_query(q):
    return np.asarray(next(iter(_get_model().query_embed(q))), dtype=np.float32)

# ---------- database ----------
def init_db():
    schema = open(os.path.join(os.path.dirname(__file__), "schema.sql"), encoding="utf-8").read()
    with psycopg.connect(DATABASE_URL, autocommit=True) as c:
        c.execute(schema)

def connect():
    conn = psycopg.connect(DATABASE_URL, autocommit=True)
    register_vector(conn)
    return conn

# ---------- reading files ----------
def extract_text(filename: str, data: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext in ("txt", "md"):
        return data.decode("utf-8", errors="ignore")
    if ext == "pdf":
        from pypdf import PdfReader
        return "\n\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
    if ext == "docx":
        from docx import Document
        return "\n\n".join(p.text for p in Document(io.BytesIO(data)).paragraphs)
    raise ValueError("Unsupported file type. Use .txt, .md, .pdf or .docx")

# ---------- chunking ----------
def chunk_text(text: str, max_chars=900, overlap=120):
    """Group paragraphs into ~900-char chunks; each chunk keeps its nearest heading for context."""
    chunks, heading, buf = [], "", ""
    def flush():
        nonlocal buf
        if buf.strip():
            chunks.append((f"{heading}\n{buf}" if heading else buf).strip())
        buf = ""
    for para in re.split(r"\n\s*\n", text.replace("\r", "")):
        para = para.strip()
        if not para:
            continue
        if para.startswith("#"):                 # markdown heading starts a new section
            flush(); heading = para.lstrip("# ").strip(); continue
        while len(para) > max_chars:             # very long paragraph: hard split with overlap
            flush(); buf = para[:max_chars]; flush(); para = para[max_chars - overlap:]
        if len(buf) + len(para) + 2 > max_chars:
            flush()
        buf += ("\n\n" if buf else "") + para
    flush()
    return chunks

# ---------- store / search ----------
def store_document(filename: str, text: str) -> int:
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No readable text found in the file")
    vectors = embed_docs(chunks)
    with connect() as c:
        c.execute("DELETE FROM documents WHERE filename=%s", (filename,))   # re-upload replaces old version
        doc_id = c.execute("INSERT INTO documents(filename) VALUES (%s) RETURNING id", (filename,)).fetchone()[0]
        with c.cursor() as cur:
            cur.executemany(
                "INSERT INTO chunks(document_id, chunk_index, content, embedding) VALUES (%s,%s,%s,%s)",
                [(doc_id, i, t, v) for i, (t, v) in enumerate(zip(chunks, vectors))])
    return len(chunks)

def search(query: str, k=4):
    qv = embed_query(query)
    with connect() as c:
        rows = c.execute(
            """SELECT ch.content, d.filename, 1 - (ch.embedding <=> %s) AS score
               FROM chunks ch JOIN documents d ON d.id = ch.document_id
               ORDER BY ch.embedding <=> %s LIMIT %s""", (qv, qv, k)).fetchall()
    return [{"content": r[0], "filename": r[1], "score": float(r[2])} for r in rows]

def list_documents():
    with connect() as c:
        rows = c.execute("""SELECT d.id, d.filename, d.created_at, count(ch.id)
                            FROM documents d LEFT JOIN chunks ch ON ch.document_id=d.id
                            GROUP BY d.id ORDER BY d.id""").fetchall()
    return [{"id": r[0], "filename": r[1], "created_at": r[2].isoformat(), "chunks": r[3]} for r in rows]

def delete_document(doc_id: int):
    with connect() as c:
        c.execute("DELETE FROM documents WHERE id=%s", (doc_id,))
