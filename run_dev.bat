@echo off
title Nexus Research - Development Launcher
echo ============================================================
echo   Nexus Research AI RAG - Development Mode
echo ============================================================
echo.
echo 1. Starting Backend API on http://127.0.0.1:8000 ...
start "Nexus Backend API (:8000)" cmd /k ".\venv\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo 2. Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo 3. Starting Frontend Dev Server on http://localhost:5173 ...
start "Nexus Frontend (:5173)" cmd /k "cd frontend && npm run dev"

echo 4. Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo Both servers are running!
echo Keep both terminal windows open while working.
pause

