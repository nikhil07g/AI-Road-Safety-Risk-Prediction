@echo off
cd /d "d:\2nd year\EVEN SEM\NLP\project"

REM Start API server in background
start "API Server" cmd /k "cd Ai-Road-Safety-Risk-Prediction-ML-main\Ai-Road-Safety-Risk-Prediction-ML-main && ..\..\venv\Scripts\python.exe -m uvicorn api_server_v3:app --host 0.0.0.0 --port 8000"

REM Wait a bit for API server to start
timeout /t 3

REM Install Node dependencies if needed
cd "Ai-Road-Safety-Risk-Prediction-ML-main\Ai-Road-Safety-Risk-Prediction-ML-main\safe-drive-ai-main\safe-drive-ai-main"
if not exist "node_modules" (
    echo Installing Node dependencies...
    call npm install
)

REM Start frontend dev server
echo Starting Frontend Dev Server...
call npm run dev

pause
