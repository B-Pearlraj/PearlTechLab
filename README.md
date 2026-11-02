# Portfolio AI Assistant (RAG with Neon pgvector)

Browser (index.html + chatbot.js)  ->  FastAPI (/chat)  ->  Neon pgvector search  ->  LLM answers only from found text

## Folder
- index.html            your page (only 2 lines added: chatbot.css link + chatbot.js script tag)
- chatbot.css / .js     floating logo button + chat panel
- admin.html            upload page for documents
- knowledge/portfolio_knowledge.md   starter document written from your site
- backend/main.py       API (/chat, /upload, /documents)
- backend/rag.py        chunking, embeddings, Neon storage + search
- backend/ingest.py     upload documents from the command line
- backend/schema.sql    Neon tables

## Setup
1. Neon: create project -> Connect -> copy the connection string (pooled is fine).
2. cd backend; copy .env.example to .env; fill DATABASE_URL, LLM_API_KEY, ADMIN_TOKEN.
3. python -m venv .venv; activate; pip install -r requirements.txt
4. Start:  uvicorn main:app --reload --port 8000   (tables are created automatically)
5. Upload the document:  python ingest.py ../knowledge/portfolio_knowledge.md
   (or open admin.html, enter ADMIN_TOKEN, choose a file, click Upload)
6. Open index.html with Live Server (port 5500) and click the logo button.

## Deploy
- Backend on Render: Build `pip install -r requirements.txt`, Start `uvicorn main:app --host 0.0.0.0 --port $PORT`,
  add the .env values as Environment Variables, set ALLOWED_ORIGINS to your site URL.
- In index.html change data-api="http://localhost:8000" to your Render URL.

## Tuning
- MIN_SCORE (default 0.45): raise to be stricter about off-topic questions, lower if valid questions get refused.
- Re-uploading a file with the same name replaces the old version.
