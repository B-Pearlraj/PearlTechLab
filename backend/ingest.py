"""Command-line upload:  python ingest.py ../knowledge/portfolio_knowledge.md [more files...]"""
import sys, os
import rag

rag.init_db()
for path in sys.argv[1:]:
    with open(path, "rb") as f:
        text = rag.extract_text(os.path.basename(path), f.read())
    n = rag.store_document(os.path.basename(path), text)
    print(f"OK  {path}  ->  {n} chunks stored in Neon")
