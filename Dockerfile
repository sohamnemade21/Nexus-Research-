# ============================================================
# Multi-stage Dockerfile for Nexus Research RAG
# Stage 1: Build React frontend
# Stage 2: Production Python server with static assets
# ============================================================

# ── Stage 1: Frontend Build ──────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Backend ──────────────────────────────
FROM python:3.12-slim

# System dependencies for PyMuPDF and general use
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directories
RUN mkdir -p data/chroma_db data/page_cache data/"pdf data"

# Environment defaults
ENV ENV=production \
    LOG_LEVEL=INFO \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run with gunicorn + uvicorn workers for production
CMD ["gunicorn", "backend.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]

