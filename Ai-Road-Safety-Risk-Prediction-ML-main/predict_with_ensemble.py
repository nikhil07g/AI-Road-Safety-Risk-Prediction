import os
import numpy as np
import joblib
from pathlib import Path

# Load trained model
MODEL_DIR = "road_quality_models"
ensemble_model = joblib.load(os.path.join(MODEL_DIR, "road_quality_ensemble_final.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler_final.pkl"))
metadata = joblib.load(os.path.join(MODEL_DIR, "model_metadata_final.pkl"))

def extract_image_features(img):
    """Extract features from a single image"""
    gray = np.mean(img, axis=2)
    
    features = [
        np.mean(gray),
        np.std(gray),
        np.min(gray),
        np.max(gray),
        np.median(gray),
        np.percentile(gray, 25),
        np.percentile(gray, 75),
        np.max(gray) - np.min(gray),
        np.std(gray) / (np.mean(gray) + 1e-5),
    ]
    
    # Edges
    edges_x = np.abs(gray[:, :-1] - gray[:, 1:]).mean()
    edges_y = np.abs(gray[:-1, :] - gray[1:, :]).mean()
    features.extend([edges_x, edges_y, edges_x + edges_y])
    
    # Texture
    lbp_binary = []
    for i in range(1, gray.shape[0] - 1):
        for j in range(1, gray.shape[1] - 1):
            center = gray[i, j]
            neighbors = gray[i-1:i+2, j-1:j+2].flatten()
            lbp_binary.append(np.sum(neighbors > center))
    
    features.append(np.mean(lbp_binary))
    features.append(np.std(lbp_binary))
    
    # Color channels
    r_channel = img[:, :, 0]
    g_channel = img[:, :, 1]
    b_channel = img[:, :, 2]
    
    features.extend([
        np.std(r_channel),
        np.std(g_channel),
        np.std(b_channel),
        np.mean(np.abs(r_channel - g_channel)),
        np.mean(np.abs(g_channel - b_channel)),
        np.mean(np.abs(r_channel - b_channel)),
    ])
    
    # Darkness
    very_dark = np.sum(gray < 0.2) / gray.size
    dark = np.sum(gray < 0.4) / gray.size
    features.extend([very_dark, dark])
    
    # Entropy
    hist, _ = np.histogram(gray, bins=32, range=(0, 1))
    hist = hist / np.sum(hist)
    entropy = -np.sum((hist[hist > 0]) * np.log2(hist[hist > 0]))
    features.append(entropy)
    
    # Spatial distribution
    top_half = gray[:gray.shape[0]//2, :].mean()
    bottom_half = gray[gray.shape[0]//2:, :].mean()
    left_half = gray[:, :gray.shape[1]//2].mean()
    right_half = gray[:, gray.shape[1]//2:].mean()
    features.extend([top_half, bottom_half, left_half, right_half])
    
    # Laplacian
    laplacian = np.zeros_like(gray)
    for i in range(1, gray.shape[0]-1):
        for j in range(1, gray.shape[1]-1):
            laplacian[i, j] = (4 * gray[i, j] - 
                              gray[i-1, j] - gray[i+1, j] - 
                              gray[i, j-1] - gray[i, j+1])
    
    features.append(np.mean(np.abs(laplacian)))
    features.append(np.std(laplacian))
    
    # Histogram
    hist, _ = np.histogram(gray, bins=16, range=(0, 1))
    hist = hist / np.sum(hist)
    features.extend(hist.tolist())
    
    return np.array(features)

def predict_road_quality(image_array):
    """
    Predict road quality from image array
    
    Args:
        image_array: numpy array of shape (224, 224, 3) with values in [0, 1]
    
    Returns:
        dict with prediction results
    """
    # Extract features
    features = extract_image_features(image_array).reshape(1, -1)
    
    # Normalize
    features_scaled = scaler.transform(features)
    
    # Predict
    prediction = ensemble_model.predict(features_scaled)[0]
    probability = ensemble_model.predict_proba(features_scaled)[0]
    
    confidence = max(probability) * 100
    
    return {
        "classification": "Pothole" if prediction == 1 else "Normal Road",
        "confidence": confidence,
        "is_pothole": bool(prediction == 1),
        "probability_normal": float(probability[0]) * 100,
        "probability_pothole": float(probability[1]) * 100,
        "risk_level": "high" if prediction == 1 else "low",
    }

if __name__ == "__main__":
    print("Road Quality Prediction Model Loaded ✓")
    print(f"Model Accuracy: {metadata['test_accuracy']*100:.2f}%")
    print(f"Sensitivity: {metadata['sensitivity']*100:.2f}%")
    print(f"Specificity: {metadata['specificity']*100:.2f}%")
