@echo off
REM Quick Start Guide for Road Quality Detection Training (Windows)

echo ==================================
echo ROAD QUALITY DETECTION - QUICK START
echo ==================================

REM Step 1: Install Dependencies
echo.
echo [Step 1/3] Installing required packages...
pip install opencv-python pillow scikit-learn numpy joblib scikit-image -q

if %errorlevel% neq 0 (
    echo.
    echo ✗ Package installation failed!
    exit /b 1
)

echo ✓ Core packages installed
echo.

REM Step 2: Preprocess Data
echo [Step 2/3] Preprocessing road quality dataset...
echo This will process 681 images (351 normal + 330 potholes)
echo.

python preprocess_road_data.py

if %errorlevel% neq 0 (
    echo.
    echo ✗ Preprocessing failed!
    exit /b 1
)

echo.
echo ✓ Data preprocessing complete!
echo   Output: road_quality_dataset/
echo.

REM Step 3: Train Model
echo [Step 3/3] Training road quality detection model...
echo This will train a machine learning model
echo.

python train_road_quality_model.py

if %errorlevel% neq 0 (
    echo.
    echo ✗ Training failed!
    exit /b 1
)

echo.
echo ==================================
echo ✓ SETUP COMPLETE!
echo ==================================
echo.
echo Next steps:
echo 1. Test the model: python predict_road_quality.py
echo 2. Start API server: python api_server_v2.py
echo 3. Update website to use the new models
echo.
echo Documentation: See ROAD_QUALITY_README.md
echo.

pause
