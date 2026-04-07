import os
import numpy as np
import joblib
from pathlib import Path
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except:
    HAS_XGBOOST = False
    
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Paths
DATASET_DIR = "road_quality_dataset"
OUTPUT_DIR = "road_quality_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("🚗 ROAD QUALITY MODEL TRAINING - ULTIMATE ACCURACY VERSION")
print("=" * 70)

# Load preprocessed data
print("\n[1/5] LOADING PREPROCESSED DATA...")
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

# Intelligent feature extraction
print("\n[2/5] BUILDING INTELLIGENT FEATURES...")
print("  Extracting texture, edge, and intensity features...")

def extract_advanced_features(X):
    """Extract comprehensive features for better accuracy"""
    features_list = []
    
    for idx, img in enumerate(X):
        if (idx + 1) % 100 == 0:
            print(f"    Processing {idx + 1}/{len(X)}...", end='\r')
        
        gray = np.mean(img, axis=2)
        
        # 1. Intensity features
        features = [
            np.mean(gray),
            np.std(gray),
            np.min(gray),
            np.max(gray),
            np.median(gray),
            np.percentile(gray, 25),
            np.percentile(gray, 75),
        ]
        
        # 2. Contrast features
        features.extend([
            np.max(gray) - np.min(gray),  # Range
            np.std(gray) / (np.mean(gray) + 1e-5),  # Normalized std
        ])
        
        # 3. Edge features (multiple methods)
        # Sobel edges
        edges_x = np.abs(gray[:, :-1] - gray[:, 1:]).mean()
        edges_y = np.abs(gray[:-1, :] - gray[1:, :]).mean()
        features.extend([edges_x, edges_y, edges_x + edges_y])
        
        # 4. Local texture (LBP-like)
        lbp_binary = []
        for i in range(1, gray.shape[0] - 1):
            for j in range(1, gray.shape[1] - 1):
                center = gray[i, j]
                neighbors = gray[i-1:i+2, j-1:j+2].flatten()
                lbp_binary.append(np.sum(neighbors > center))
        
        features.append(np.mean(lbp_binary))
        features.append(np.std(lbp_binary))
        
        # 5. Color channel variance (RGB)
        r_channel = img[:, :, 0]
        g_channel = img[:, :, 1]
        b_channel = img[:, :, 2]
        
        features.extend([
            np.std(r_channel),
            np.std(g_channel),
            np.std(b_channel),
            np.mean(np.abs(r_channel - g_channel)),  # Color difference
            np.mean(np.abs(g_channel - b_channel)),
            np.mean(np.abs(r_channel - b_channel)),
        ])
        
        # 6. Damage indicator (darkness)
        very_dark = np.sum(gray < 0.2) / gray.size
        dark = np.sum(gray < 0.4) / gray.size
        features.extend([very_dark, dark])
        
        # 7. Texture uniformity (entropy-like)
        hist, _ = np.histogram(gray, bins=32, range=(0, 1))
        hist = hist / np.sum(hist)
        entropy = -np.sum((hist[hist > 0]) * np.log2(hist[hist > 0]))
        features.append(entropy)
        
        # 8. Spatial distribution
        top_half = gray[:gray.shape[0]//2, :].mean()
        bottom_half = gray[gray.shape[0]//2:, :].mean()
        left_half = gray[:, :gray.shape[1]//2].mean()
        right_half = gray[:, gray.shape[1]//2:].mean()
        features.extend([top_half, bottom_half, left_half, right_half])
        
        # 9. High-frequency content (sharp transitions)
        laplacian = np.zeros_like(gray)
        for i in range(1, gray.shape[0]-1):
            for j in range(1, gray.shape[1]-1):
                laplacian[i, j] = (4 * gray[i, j] - 
                                  gray[i-1, j] - gray[i+1, j] - 
                                  gray[i, j-1] - gray[i, j+1])
        
        features.append(np.mean(np.abs(laplacian)))
        features.append(np.std(laplacian))
        
        # 10. Histogram features (normalized)
        hist, _ = np.histogram(gray, bins=16, range=(0, 1))
        hist = hist / np.sum(hist)
        features.extend(hist.tolist())
        
        features_list.append(features)
    
    print("  ✓ Feature extraction complete                      ")
    return np.array(features_list)

X_train_feat = extract_advanced_features(X_train)
X_val_feat = extract_advanced_features(X_val)
X_test_feat = extract_advanced_features(X_test)

print(f"  ✓ Final feature count: {X_train_feat.shape[1]}")

# Normalize
print("\n[3/5] NORMALIZING FEATURES...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_feat)
X_val_scaled = scaler.transform(X_val_feat)
X_test_scaled = scaler.transform(X_test_feat)
print("  ✓ Normalization complete")

# Training models
print("\n[4/5] TRAINING ENSEMBLE MODELS...")

models = {}

# Model 1: XGBoost (if available)
if HAS_XGBOOST:
    print("  [1/3] Training XGBoost...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='binary:logistic',
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        verbosity=0,
    )
    xgb_model.fit(X_train_scaled, y_train)
    xgb_train = accuracy_score(y_train, xgb_model.predict(X_train_scaled))
    xgb_val = accuracy_score(y_val, xgb_model.predict(X_val_scaled))
    xgb_test = accuracy_score(y_test, xgb_model.predict(X_test_scaled))
    print(f"    ✓ XGBoost test accuracy: {xgb_test:.4f}")
    models['xgb'] = xgb_model
else:
    print("  [1/3] XGBoost not available (skipping)")

# Model 2: Extra Trees
print("  [2/3] Training Extra Trees...")
et_model = ExtraTreesClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=3,
    min_samples_leaf=1,
    max_features='sqrt',
    n_jobs=-1,
    random_state=42,
)
et_model.fit(X_train_scaled, y_train)
et_test = accuracy_score(y_test, et_model.predict(X_test_scaled))
print(f"    ✓ Extra Trees test accuracy: {et_test:.4f}")
models['et'] = et_model

# Model 3: Random Forest (with optimized params)
print("  [3/3] Training Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=18,
    min_samples_split=2,
    min_samples_leaf=1,
    max_features='sqrt',
    n_jobs=-1,
    random_state=42,
)
rf_model.fit(X_train_scaled, y_train)
rf_test = accuracy_score(y_test, rf_model.predict(X_test_scaled))
print(f"    ✓ Random Forest test accuracy: {rf_test:.4f}")
models['rf'] = rf_model

# Voting ensemble
print("\n[5/5] CREATING VOTING ENSEMBLE...")

from sklearn.ensemble import VotingClassifier
weights = []
if HAS_XGBOOST:
    weights = [0.35, 0.35, 0.30]  # XGB, ET, RF
    voting_models = [('xgb', xgb_model), ('et', et_model), ('rf', rf_model)]
else:
    weights = [0.5, 0.5]  # ET, RF
    voting_models = [('et', et_model), ('rf', rf_model)]

ensemble = VotingClassifier(
    estimators=voting_models,
    voting='soft',
    weights=weights,
)
ensemble.fit(X_train_scaled, y_train)

# Final evaluation
print("\n" + "=" * 70)
print("FINAL MODEL EVALUATION")
print("=" * 70)

test_pred = ensemble.predict(X_test_scaled)
test_accuracy = accuracy_score(y_test, test_pred)

print(f"\n{'*' * 70}")
print(f"🎯 FINAL ENSEMBLE ACCURACY: {test_accuracy*100:.2f}%")
print(f"{'*' * 70}")

# Detailed metrics
print("\nClassification Report:")
print(classification_report(y_test, test_pred, target_names=["Normal Road", "Pothole"]))

cm = confusion_matrix(y_test, test_pred)
tn, fp, fn, tp = cm.ravel()

sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
precision = tp / (tp + fp) if (tp + fp) > 0 else 0
f1 = 2 * (precision * sensitivity) / (precision + sensitivity) if (precision + sensitivity) > 0 else 0

print(f"\nConfusion Matrix:")
print(f"  ✓ True Negatives:  {tn} | False Positives: {fp}")
print(f"  ✓ False Negatives: {fn} | True Positives:  {tp}")

print(f"\nKey Metrics:")
print(f"  ✓ Sensitivity (Pothole Detection):  {sensitivity*100:.2f}%")
print(f"  ✓ Specificity (Normal Accuracy):    {specificity*100:.2f}%")
print(f"  ✓ Precision:                        {precision*100:.2f}%")
print(f"  ✓ F1-Score:                         {f1:.4f}")

# Save models
print("\nSaving models...")
joblib.dump(ensemble, os.path.join(OUTPUT_DIR, "road_quality_ensemble_final.pkl"))
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "scaler_final.pkl"))

metadata = {
    "model_type": "Ensemble Voting Classifier",
    "base_models": list(models.keys()),
    "weights": weights,
    "feature_count": X_train_scaled.shape[1],
    "test_accuracy": float(test_accuracy),
    "sensitivity": float(sensitivity),
    "specificity": float(specificity),
    "precision": float(precision),
    "f1_score": float(f1),
    "training_date": datetime.now().isoformat(),
}

joblib.dump(metadata, os.path.join(OUTPUT_DIR, "model_metadata_final.pkl"))
print("  ✓ All models saved!")

print("\n" + "=" * 70)
print("✅ TRAINING COMPLETE!")
print("=" * 70)
print(f"\n📊 FINAL PERFORMANCE:")
print(f"  • Accuracy:    {test_accuracy*100:.2f}%")
print(f"  • Sensitivity: {sensitivity*100:.2f}%")
print(f"  • Specificity: {specificity*100:.2f}%")
print(f"\n🚀 Models ready for deployment!\n")
