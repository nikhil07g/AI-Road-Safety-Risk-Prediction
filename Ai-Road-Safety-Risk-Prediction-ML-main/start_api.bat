@echo off
REM Safe Drive AI - Quick Deployment Script

echo.
echo ============================================================
echo   Safe Drive AI - Road Quality Detection
echo   QUICK START DEPLOYMENT
echo ============================================================
echo.

setlocal enabledelayedexpansion

REM Check if venv exists
if not exist ".venv" (
    echo ERROR: Virtual environment not found!
    echo Please run setup_guide.bat first
    exit /b 1
)

REM Activate venv
call .venv\Scripts\activate.bat

if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not available in virtual environment
    exit /b 1
)

echo [1/3] Checking dependencies...
python -c "import fastapi, uvicorn, sklearn, xgboost, joblib, cv2, PIL, httpx" >nul 2>&1
if errorlevel 1 (
    echo [!] Installing missing packages...
    pip install fastapi uvicorn scikit-learn xgboost joblib opencv-python pillow python-multipart httpx --quiet
)
echo      ✓ All dependencies ready

echo.
echo [2/3] Verifying model files...
if not exist "road_quality_models\road_quality_ensemble_final.pkl" (
    echo ERROR: Trained model not found!
    echo Please run training script first
    exit /b 1
)
echo      ✓ Model files found

echo.
echo [3/3] Starting API Server...
echo      Starting on http://localhost:8000
echo      Press Ctrl+C to stop
echo.
echo ============================================================
echo   API Documentation: http://localhost:8000/docs
echo   Health Check:      http://localhost:8000/api/health
echo ============================================================
echo.

REM Start server
python api_server_v3.py

pause
