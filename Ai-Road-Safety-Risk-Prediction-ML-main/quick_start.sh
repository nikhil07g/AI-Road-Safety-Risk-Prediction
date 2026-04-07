#!/bin/bash
# Quick Start Guide for Road Quality Detection Training

echo "=================================="
echo "ROAD QUALITY DETECTION - QUICK START"
echo "=================================="

# Step 1: Install Dependencies
echo ""
echo "[Step 1/3] Installing required packages..."
pip install opencv-python pillow scikit-learn numpy joblib scikit-image -q

echo "✓ Core packages installed"
echo ""

# Step 2: Preprocess Data
echo "[Step 2/3] Preprocessing road quality dataset..."
echo "This will process 681 images (351 normal + 330 potholes)"
echo ""

python preprocess_road_data.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Data preprocessing complete!"
    echo "  Output: road_quality_dataset/"
else
    echo "❌ Preprocessing failed!"
    exit 1
fi

# Step 3: Train Model
echo ""
echo "[Step 3/3] Training road quality detection model..."
echo "This will train a machine learning model"
echo ""

python train_road_quality_model.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Model training complete!"
    echo "  Output: road_quality_models/"
else
    echo "❌ Training failed!"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ SETUP COMPLETE!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Test the model: python predict_road_quality.py"
echo "2. Start API server: python api_server_v2.py"
echo "3. Update website to use the new models"
echo ""
echo "Documentation: See ROAD_QUALITY_README.md"
