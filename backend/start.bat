@echo off
title LifeLine AI - FastAPI Backend Server
cd /d "%~dp0"
echo ====================================================================
echo Starting LifeLine AI FastAPI Backend on http://localhost:8000 ...
echo Virtual Environment: .venv
echo ====================================================================
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
pause

