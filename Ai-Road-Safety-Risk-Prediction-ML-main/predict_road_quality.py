import os
import cv2
import numpy as np
import joblib
from pathlib import Path

# Try to load TensorFlow model, fallback to sklearn
MODEL_DIR = "road_quality_models"
USE_CNN = os.path.exists(os.path.join(MODEL_DIR, "road_quality_cnn_model.h5"))

if USE_CNN:
    try:
        from tensorflow import keras
        model = keras.models.load_model(os.path.join(MODEL_DIR, "road_quality_cnn_model.h5"))
        print("✓ Loaded CNN model")
    except:
        USE_CNN = False
        print("⚠️  Failed to load CNN model, using fallback")

if not USE_CNN:
    model = joblib.load(os.path.join(MODEL_DIR, "road_quality_rf_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "feature_scaler.pkl"))
    print("✓ Loaded Random Forest model")

# Load class info
class_info = joblib.load(os.path.join(MODEL_DIR, "class_info.pkl"))

def preprocess_image(image_path_or_array, target_size=224):
    """
    Preprocess image for model prediction
    
    Args:
        image_path_or_array: Either a file path or a numpy array
        target_size: Target image size (default: 224)
    
    Returns:
        Preprocessed image array
    """
    if isinstance(image_path_or_array, str):
        # Load from file
        img = cv2.imread(image_path_or_array)
        if img is None:
            raise ValueError(f"Could not load image from {image_path_or_array}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        # Use array directly
        img = image_path_or_array

    # Resize
    img = cv2.resize(img, (target_size, target_size))

    # Normalize
    img = img.astype(np.float32) / 255.0

    return img


def predict_road_quality(image_path_or_array, return_confidence=True):
    """
    Predict road quality from image
    
    Args:
        image_path_or_array: Image file path or numpy array
        return_confidence: Whether to return confidence score
    
    Returns:
        Dictionary with:
        - classification: "Normal Road" or "Pothole"
        - confidence: Confidence score (0-100)
        - raw_score: Raw model output
        - risk_level: "low" for normal, "high" for pothole
    """
    try:
        # Preprocess image
        img = preprocess_image(image_path_or_array)

        if USE_CNN:
            # Add batch dimension
            img_batch = np.expand_dims(img, axis=0)

            # Predict
            raw_score = model.predict(img_batch, verbose=0)[0][0]
        else:
            # Flatten for Random Forest
            img_flat = img.reshape(1, -1)
            img_flat = scaler.transform(img_flat)

            # Get prediction probability
            raw_score = model.predict_proba(img_flat)[0][1]

        # Convert to percentage
        confidence = float(raw_score) * 100

        # Classify
        is_pothole = raw_score > 0.5
        classification = class_info["class_names"][1 if is_pothole else 0]
        risk_level = "high" if is_pothole else "low"

        return {
            "classification": classification,
            "confidence": round(confidence, 2),
            "raw_score": round(float(raw_score), 4),
            "risk_level": risk_level,
            "is_pothole": bool(is_pothole),
        }

    except Exception as e:
        return {
            "error": str(e),
            "classification": "Error",
            "confidence": 0,
            "risk_level": "unknown",
        }


def batch_predict_road_quality(image_paths_or_arrays):
    """
    Predict road quality for multiple images
    
    Args:
        image_paths_or_arrays: List of image file paths or numpy arrays
    
    Returns:
        List of prediction dictionaries
    """
    results = []
    for img in image_paths_or_arrays:
        result = predict_road_quality(img)
        results.append(result)
    return results


# Example usage
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("ROAD QUALITY PREDICTION MODULE")
    print("=" * 70)

    print("\nAvailable functions:")
    print("  - predict_road_quality(image_path) -> dict")
    print("  - batch_predict_road_quality(image_list) -> list[dict]")

    print("\nExample:")
    print("""
    import predict_road_quality as rq
    
    # Single image
    result = rq.predict_road_quality("path/to/image.jpg")
    print(result)
    
    # Batch prediction
    results = rq.batch_predict_road_quality(["img1.jpg", "img2.jpg"])
    for result in results:
        print(f"{result['classification']}: {result['confidence']}%")
    """)

    print("\nModel Information:")
    print(f"  - Model type: {class_info['model_type']}")
    print(f"  - Classes: {class_info['class_names']}")
    print(f"  - Image size: {class_info['img_size']}x{class_info['img_size']}")

    print("\n" + "=" * 70)
