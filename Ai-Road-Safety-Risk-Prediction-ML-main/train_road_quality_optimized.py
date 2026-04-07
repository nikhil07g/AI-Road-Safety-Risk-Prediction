import os
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# Paths
DATASET_DIR = "road_quality_dataset"
OUTPUT_DIR = "road_quality_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("🚗 ROAD QUALITY MODEL TRAINING - OPTIMIZED FOR ACCURACY")
print("=" * 70)

# Load preprocessed data
print("\n[1/4] LOADING PREPROCESSED DATA...")
data = np.load(os.path.join(DATASET_DIR, "road_quality_data.npz"))
X_train = data["X_train"]
y_train = data["y_train"]
X_val = data["X_val"]
y_val = data["y_val"]
X_test = data["X_test"]
y_test = data["y_test"]

print(f"  ✓ Training samples: {len(X_train)}")
print(f"  ✓ Validation samples: {len(X_val)}")
print(f"  ✓ Test samples: {len(X_test)}")

# Extract features from images
print("\n[2/4] EXTRACTING IMAGE FEATURES...")
print("  Computing image features (this may take 1-2 minutes)...")

def extract_image_features(X):
    """Extract statistical and structural features from images"""
    features_list = []
    
    for idx, img in enumerate(X):
        if (idx + 1) % 100 == 0:
            print(f"    Processed {idx + 1}/{len(X)} images", end='\r')
        
        # Convert to grayscale
        gray = np.mean(img, axis=2)
        
        # Statistical features
        mean_intensity = np.mean(gray)
        std_intensity = np.std(gray)
        min_intensity = np.min(gray)
        max_intensity = np.max(gray)
        
        # Edge detection (Sobel-like)
        edges_h = np.abs(gray[:, :-1] - gray[:, 1:]).sum()
        edges_v = np.abs(gray[:-1, :] - gray[1:, :]).sum()
        
        # Texture (variance in local windows)
        windows = []
        for i in range(0, gray.shape[0], 32):
            for j in range(0, gray.shape[1], 32):
                window = gray[i:i+32, j:j+32]
                if window.size > 0:
                    windows.append(np.var(window))
        
        texture_score = np.mean(windows) if windows else 0
        
        # Darkness ratio (darker areas indicate damage)
        dark_pixels = np.sum(gray < 0.4)
        darkness_ratio = dark_pixels / gray.size
        
        # Combine features
        features = [
            mean_intensity,
            std_intensity,
            min_intensity,
            max_intensity,
            edges_h,
            edges_v,
            texture_score,
            darkness_ratio,
        ]
        
        features_list.append(features)
    
    print("    ✓ Feature extraction complete                   ")
    return np.array(features_list)

X_train_feat = extract_image_features(X_train)
X_val_feat = extract_image_features(X_val)
X_test_feat = extract_image_features(X_test)

# Normalize features
print("  ✓ Normalizing features...")
scaler = StandardScaler()
X_train_feat_scaled = scaler.fit_transform(X_train_feat)
X_val_feat_scaled = scaler.transform(X_val_feat)
X_test_feat_scaled = scaler.transform(X_test_feat)

# Train optimized ensemble model
print("\n[3/4] TRAINING ENSEMBLE MODEL (Gradient Boosting + SVM)...")
print("  This combines multiple algorithms for better accuracy...")

# Model 1: Gradient Boosting (excellent for this task)
gb_model = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.08,
    max_depth=6,
    subsample=0.8,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    verbose=0,
)

# Model 2: SVM (good for small datasets)
svm_model = SVC(
    kernel='rbf',
    C=100,
    gamma='scale',
    probability=True,
    random_state=42,
)

# Train individual models
print("  Training Gradient Boosting...")
gb_model.fit(X_train_feat_scaled, y_train)
gb_train_acc = gb_model.score(X_train_feat_scaled, y_train)
gb_val_acc = gb_model.score(X_val_feat_scaled, y_val)
print(f"    ✓ GB Training accuracy: {gb_train_acc:.4f}")
print(f"    ✓ GB Validation accuracy: {gb_val_acc:.4f}")

print("  Training SVM...")
svm_model.fit(X_train_feat_scaled, y_train)
svm_train_acc = svm_model.score(X_train_feat_scaled, y_train)
svm_val_acc = svm_model.score(X_val_feat_scaled, y_val)
print(f"    ✓ SVM Training accuracy: {svm_train_acc:.4f}")
print(f"    ✓ SVM Validation accuracy: {svm_val_acc:.4f}")

# Ensemble (weighted voting)
voting_clf = VotingClassifier(
    estimators=[('gb', gb_model), ('svm', svm_model)],
    voting='soft',
    weights=[0.6, 0.4],  # Give more weight to GB as it performs better
)

voting_clf.fit(X_train_feat_scaled, y_train)

# Evaluate on all sets
print("\n[4/4] EVALUATING MODEL...")
train_pred = voting_clf.predict(X_train_feat_scaled)
val_pred = voting_clf.predict(X_val_feat_scaled)
test_pred = voting_clf.predict(X_test_feat_scaled)

train_accuracy = accuracy_score(y_train, train_pred)
val_accuracy = accuracy_score(y_val, val_pred)
test_accuracy = accuracy_score(y_test, test_pred)

print(f"\n  Training Accuracy:   {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
print(f"  Validation Accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)")
print(f"  TEST ACCURACY:       {test_accuracy:.4f} ({test_accuracy*100:.2f}%) 🎯")

# Detailed metrics
print("\nDetailed Classification Report (Test Set):")
print(classification_report(y_test, test_pred, target_names=["Normal Road", "Pothole"]))

# Confusion Matrix
cm = confusion_matrix(y_test, test_pred)
tn, fp, fn, tp = cm.ravel()
print(f"\nConfusion Matrix Analysis:")
print(f"  True Negatives (Correct Normal):  {tn}")
print(f"  False Positives (Normal→Pothole): {fp}")
print(f"  False Negatives (Pothole→Normal): {fn}")
print(f"  True Positives (Correct Pothole): {tp}")

sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
precision = tp / (tp + fp) if (tp + fp) > 0 else 0

print(f"\n  Sensitivity (Catch rate):    {sensitivity:.4f} ({sensitivity*100:.2f}%)")
print(f"  Specificity (Accuracy on normal): {specificity:.4f} ({specificity*100:.2f}%)")
print(f"  Precision (Pothole accuracy):     {precision:.4f} ({precision*100:.2f}%)")

# Save models
print("\nSaving models...")
joblib.dump(voting_clf, os.path.join(OUTPUT_DIR, "road_quality_ensemble_model.pkl"))
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "feature_scaler.pkl"))
print(f"  ✓ Ensemble model saved")
print(f"  ✓ Feature scaler saved")

# Save feature extractor info
joblib.dump({
    "model_type": "Ensemble (Gradient Boosting + SVM)",
    "feature_count": 8,
    "class_names": ["Normal Road", "Pothole"],
    "test_accuracy": float(test_accuracy),
    "sensitivity": float(sensitivity),
    "specificity": float(specificity),
    "precision": float(precision),
}, os.path.join(OUTPUT_DIR, "model_info.pkl"))

# Create training report
report = f"""
🚗 ROAD QUALITY MODEL TRAINING REPORT
{'=' * 70}

Model: Ensemble (Gradient Boosting + SVM)
Training Date: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}

Dataset:
  - Training samples: {len(X_train)}
  - Validation samples: {len(X_val)}
  - Test samples: {len(X_test)}
  - Total: {len(X_train) + len(X_val) + len(X_test)}

Classes:
  - 0: Normal Road ({np.sum(y_test == 0)} in test set)
  - 1: Pothole ({np.sum(y_test == 1)} in test set)

Feature Extraction:
  - Mean intensity
  - Standard deviation intensity
  - Min/Max intensity
  - Edge detection (horizontal & vertical)
  - Texture score (local variance)
  - Darkness ratio

Model Performance:
  ✓ Training Accuracy:   {train_accuracy:.4f} ({train_accuracy*100:.2f}%)
  ✓ Validation Accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)
  ✓ TEST ACCURACY:       {test_accuracy:.4f} ({test_accuracy*100:.2f}%)

Classification Metrics:
  ✓ Sensitivity (Recall): {sensitivity:.4f} ({sensitivity*100:.2f}%) - Detects {sensitivity*100:.1f}% of potholes
  ✓ Specificity: {specificity:.4f} ({specificity*100:.2f}%) - Correctly identifies {specificity*100:.1f}% of normal roads
  ✓ Precision: {precision:.4f} ({precision*100:.2f}%) - {precision*100:.1f}% of detected potholes are correct

Features Used: 8 extracted features per image
Model Type: Weighted Voting Ensemble
  - Gradient Boosting (60% weight)
  - Support Vector Machine (40% weight)

Files Created:
  ✓ road_quality_ensemble_model.pkl - Trained ensemble model
  ✓ feature_scaler.pkl - Feature normalization scaler
  ✓ model_info.pkl - Model metadata

Ready for deployment in production!
"""

import pandas as pd

with open(os.path.join(OUTPUT_DIR, "training_report.txt"), "w", encoding='utf-8') as f:
    f.write(report)

print(f"  ✓ Training report saved")

print("\n" + "=" * 70)
print("✅ MODEL TRAINING COMPLETE!")
print("=" * 70)
print(f"\nResults:")
print(f"  • Accuracy: {test_accuracy*100:.2f}%")
print(f"  • Sensitivity: {sensitivity*100:.2f}%")
print(f"  • Specificity: {specificity*100:.2f}%")
print(f"\nModels saved to: {os.path.abspath(OUTPUT_DIR)}/")
print(f"Ready for deployment! 🚀")
