import os
import numpy as np
import joblib
from pathlib import Path

try:
    from tensorflow import keras
    from tensorflow.keras import layers
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    USE_TENSORFLOW = True
except ImportError:
    print("⚠️  TensorFlow not installed. Using scikit-learn with traditional ML approach...")
    USE_TENSORFLOW = False
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    import cv2

# Paths
DATASET_DIR = "road_quality_dataset"
OUTPUT_DIR = "road_quality_models"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("ROAD QUALITY MODEL TRAINING")
print("=" * 70)

# Load preprocessed data
print("\n[1/3] LOADING PREPROCESSED DATA...")
data = np.load(os.path.join(DATASET_DIR, "road_quality_data.npz"))
X_train = data["X_train"]
y_train = data["y_train"]
X_val = data["X_val"]
y_val = data["y_val"]
X_test = data["X_test"]
y_test = data["y_test"]

print(f"  ✓ X_train shape: {X_train.shape} (dtype: {X_train.dtype})")
print(f"  ✓ X_val shape: {X_val.shape}")
print(f"  ✓ X_test shape: {X_test.shape}")
print(f"  ✓ y_train unique values: {np.unique(y_train)}")

# Load metadata
metadata = joblib.load(os.path.join(DATASET_DIR, "metadata.pkl"))
print(f"  ✓ Loaded metadata ({metadata['total_images']} total images)")

if USE_TENSORFLOW:
    print("\n[2/3] BUILDING CNN MODEL...")
    
    # Build CNN model
    model = Sequential([
        # Block 1
        Conv2D(32, (3, 3), activation="relu", padding="same", input_shape=(224, 224, 3)),
        BatchNormalization(),
        Conv2D(32, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        MaxPooling2D((2, 2)),
        Dropout(0.25),

        # Block 2
        Conv2D(64, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        Conv2D(64, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        MaxPooling2D((2, 2)),
        Dropout(0.25),

        # Block 3
        Conv2D(128, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        Conv2D(128, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        MaxPooling2D((2, 2)),
        Dropout(0.25),

        # Block 4
        Conv2D(256, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        Conv2D(256, (3, 3), activation="relu", padding="same"),
        BatchNormalization(),
        MaxPooling2D((2, 2)),
        Dropout(0.25),

        # Fully connected layers
        Flatten(),
        Dense(512, activation="relu"),
        BatchNormalization(),
        Dropout(0.5),
        Dense(256, activation="relu"),
        BatchNormalization(),
        Dropout(0.5),
        Dense(1, activation="sigmoid"),
    ])

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )

    print(model.summary())

    print("\n[3/3] TRAINING MODEL...")
    
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
    ]

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=50,
        batch_size=32,
        callbacks=callbacks,
        verbose=1,
    )

    # Evaluate on test set
    print("\nEvaluating on test set...")
    test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"  ✓ Test Loss: {test_loss:.4f}")
    print(f"  ✓ Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")

    # Save model
    model.save(os.path.join(OUTPUT_DIR, "road_quality_cnn_model.h5"))
    print(f"\n  ✓ Saved model to road_quality_cnn_model.h5")

    # Save training history
    joblib.dump(history.history, os.path.join(OUTPUT_DIR, "training_history.pkl"))
    print(f"  ✓ Saved training history")

else:
    print("\n[2/3] BUILDING RANDOM FOREST MODEL...")
    
    # Flatten images for Random Forest
    X_train_flat = X_train.reshape(X_train.shape[0], -1)
    X_val_flat = X_val.reshape(X_val.shape[0], -1)
    X_test_flat = X_test.reshape(X_test.shape[0], -1)

    # Scale features
    scaler = StandardScaler()
    X_train_flat = scaler.fit_transform(X_train_flat)
    X_val_flat = scaler.transform(X_val_flat)
    X_test_flat = scaler.transform(X_test_flat)

    # Train Random Forest
    print("\n[3/3] TRAINING MODEL...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )

    model.fit(X_train_flat, y_train)

    # Evaluate
    train_accuracy = model.score(X_train_flat, y_train)
    val_accuracy = model.score(X_val_flat, y_val)
    test_accuracy = model.score(X_test_flat, y_test)

    print(f"\n  ✓ Training Accuracy: {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
    print(f"  ✓ Validation Accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)")
    print(f"  ✓ Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")

    # Save model and scaler
    joblib.dump(model, os.path.join(OUTPUT_DIR, "road_quality_rf_model.pkl"))
    joblib.dump(scaler, os.path.join(OUTPUT_DIR, "feature_scaler.pkl"))
    print(f"\n  ✓ Saved model to road_quality_rf_model.pkl")
    print(f"  ✓ Saved scaler to feature_scaler.pkl")

# Save metadata and class info
class_info = {
    "class_names": ["Normal Road", "Pothole"],
    "img_size": 224,
    "channels": 3,
    "model_type": "CNN" if USE_TENSORFLOW else "RandomForest",
}

joblib.dump(class_info, os.path.join(OUTPUT_DIR, "class_info.pkl"))
print(f"  ✓ Saved class info")

# Create training report
report = f"""
ROAD QUALITY MODEL TRAINING REPORT
{'=' * 70}

Model Type: {"CNN (TensorFlow)" if USE_TENSORFLOW else "Random Forest"}
Training Date: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S') if 'pd' in dir() else 'N/A'}

Dataset:
  - Training samples: {len(X_train)}
  - Validation samples: {len(X_val)}
  - Test samples: {len(X_test)}
  - Total: {len(X_train) + len(X_val) + len(X_test)}

Classes:
  - 0: Normal Road ({np.sum(y_test == 0)} in test set)
  - 1: Pothole ({np.sum(y_test == 1)} in test set)

Image Preprocessing:
  - Size: 224x224
  - Channels: 3 (RGB)
  - Normalization: [0, 1]

Performance:
  - Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)

Model Outputs:
  ✓ Model weights saved
  ✓ Class information saved
  ✓ Ready for deployment

Usage:
  Load the model and use it to classify road images:
  - Input shape: (224, 224, 3) with values in [0, 1]
  - Output: Binary classification (0=Normal, 1=Pothole)
  - Confidence: Output probability value
"""

import pandas as pd

with open(os.path.join(OUTPUT_DIR, "training_report.txt"), "w") as f:
    f.write(report)
print(f"  ✓ Saved training report")

print("\n" + "=" * 70)
print("✅ MODEL TRAINING COMPLETE!")
print("=" * 70)
print(f"\nModel saved to: {os.path.abspath(OUTPUT_DIR)}/")
print(f"Ready for deployment in the web application!")
