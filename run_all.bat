@echo off
cd /d "d:\2nd year\EVEN SEM\NLP\project"

REM The backend serves the prebuilt frontend from frontend\dist.
echo Starting Safe Drive AI at http://localhost:8000
".venv\Scripts\python.exe" -m uvicorn backend.start_server:app --host 0.0.0.0 --port 8000

pause
