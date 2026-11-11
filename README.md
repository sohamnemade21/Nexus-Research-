# 🔍 Perplexity-Style AI Research RAG

A production-grade, Perplexity-inspired research engine that delivers grounded, cited answers generated **strictly from your indexed PDF books and documents**.

---

## ✨ Features

- **🎯 Strict Factuality & Grounding**: Generated answers use *only* retrieved document chunks. If an answer isn't in the knowledge base, it says *"I don't know based on the available documents."*
- **📑 Clickable Citations & Source Cards**: Every response links to exact document titles and page numbers with snippet previews and full modal views.
- **⚡ Real-Time Streaming (SSE)**: Fast token-by-token generation with instantaneous source card retrieval via Server-Sent Events.
- **🎨 Modern Perplexity Interface**: Centered search bar with quick suggestions, collapsible sidebar history, responsive layout, and dark/light theme switching.
- **💾 Persistent Vector Storage**: Powered by ChromaDB with OpenAI `text-embedding-3-small` embeddings and `gpt-4o-mini` inference.
- **📥 Dynamic PDF Ingestion**: Ingest documents on the fly via direct PDF URLs or drag-and-drop file uploads.
- **🛡️ Production Architecture**: FastAPI backend with SlowAPI rate limiting, execution time logging, CORS, Pydantic validation, and modular architecture.
- **📊 LangSmith Evaluation & Tracing**: Retains the comprehensive 4-evaluator suite (Correctness, Relevance, Groundedness, Retrieval Relevance).

---

## 🏗️ Architecture

```
├── backend/
│   ├── api/
│   │   ├── middleware.py       # Rate limiting, access logging, CORS
│   │   ├── models.py           # Pydantic request/response schemas
│   │   └── routes.py           # /api/chat, /api/documents, /api/health
│   ├── rag/
│   │   ├── chain.py            # Streaming & non-streaming RAG chains
│   │   ├── config.py           # Centralized environment configuration
│   │   ├── evaluation.py       # LangSmith LLM-as-judge evaluation pipeline
│   │   ├── ingestion.py        # PDF downloader, loader, splitter, indexer
│   │   ├── llm.py              # ChatOpenAI client singletons
│   │   └── vectorstore.py      # ChromaDB persistent vector database
│   └── main.py                 # FastAPI application & startup lifecycle
├── frontend/                   # React + Vite + Tailwind CSS interface
├── data/                       # ChromaDB persistent storage (git-ignored)
├── .env.example                # Configuration template
├── requirements.txt            # Python dependencies
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
# 1. Activate your virtual environment
.\venv\Scripts\Activate.ps1    # Windows PowerShell
# or source venv/bin/activate    # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure your .env file
cp .env.example .env
# Edit .env and insert your OPENAI_API_KEY and LANGSMITH_API_KEY

# 4. Start the FastAPI backend
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health`

---

### 2. Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## 🐳 Docker Deployment (Recommended for Production)

The fastest way to run the full stack in production:

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY (required) and other settings

# 2. Build and run
docker compose up --build -d

# 3. Check health
curl http://localhost:8000/api/health
```

The app will be available at `http://localhost:8000` with:
- API endpoints at `/api/*`
- Health check at `/api/health`
- Interactive docs at `/docs` (development mode only)

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key for embeddings and inference |
| `ENV` | — | `production` | `development` enables auto-reload and API docs |
| `API_KEY` | — | — | Set to require `X-API-Key` header on all requests |
| `CORS_ORIGINS` | — | `localhost:5173,3000` | Comma-separated allowed origins |
| `MAX_UPLOAD_SIZE_MB` | — | `50` | Maximum PDF upload size in MB |

See `.env.example` for all available configuration options.

---

## 📡 API Reference

### 1. `POST /api/chat`
Ask a question and receive a grounded answer with citations.

**Request (JSON / Streaming):**
```json
{
  "question": "What is Retrieval-Augmented Generation?",
  "stream": true,
  "conversation_id": "optional-session-id",
  "chat_history": []
}
```

### 2. `POST /api/documents/url`
Download and index a PDF from a public web URL.

```json
{
  "url": "https://example.com/sample.pdf"
}
```

### 3. `POST /api/documents/upload`
Upload a PDF file from your local machine (multipart/form-data).

### 4. `GET /api/health`
System and vector database health check.

---

## 🧪 Running LangSmith Evaluations

To run the offline LLM-as-a-judge evaluation suite on your dataset:

```bash
python -m backend.rag.evaluation
```
