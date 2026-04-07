import os
import cv2
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
import joblib

# Paths
POTHOLES_DIR = r"C:\Users\D Sai tejashwini\Downloads\Telegram Desktop\archive\potholes"
NORMAL_DIR = r"C:\Users\D Sai tejashwini\Downloads\Telegram Desktop\archive\normal"
OUTPUT_DIR = "road_quality_dataset"

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Image parameters
IMG_SIZE = 224
CHANNELS = 3

print("=" * 60)
print("ROAD QUALITY IMAGE PREPROCESSING")
print("=" * 60)

# Load and preprocess images
def load_and_preprocess_images(directory, label, img_size=IMG_SIZE):
    """
    Load images from directory, resize, and normalize
    Args:
        directory: Path to image directory
        label: 0 for normal, 1 for potholes
        img_size: Target image size
    Returns:
        List of (image, label) tuples
    """
    images = []
    labels = []
    failed_count = 0

    files = sorted([f for f in os.listdir(directory) if f.endswith(('.jpg', '.jpeg', '.png'))])
    print(f"\nLoading from {Path(directory).name}/ ({len(files)} images)...")

    for idx, filename in enumerate(files):
        try:
            filepath = os.path.join(directory, filename)
            img = cv2.imread(filepath)

            if img is None:
                print(f"  ❌ Failed to load: {filename}")
                failed_count += 1
                continue

            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Resize to target size
            img = cv2.resize(img, (img_size, img_size))

            # Normalize pixel values to [0, 1]
            img = img.astype(np.float32) / 255.0

            images.append(img)
            labels.append(label)

            if (idx + 1) % 50 == 0:
                print(f"  ✓ Processed {idx + 1}/{len(files)} images")

        except Exception as e:
            print(f"  ❌ Error processing {filename}: {str(e)}")
            failed_count += 1
            continue

    print(f"  ✓ Successfully loaded {len(images)} images ({failed_count} failed)")
    return images, labels


# Load normal road images (label: 0)
print("\n[1/3] LOADING NORMAL ROAD IMAGES...")
normal_images, normal_labels = load_and_preprocess_images(NORMAL_DIR, label=0)

# Load pothole images (label: 1)
print("\n[2/3] LOADING POTHOLE IMAGES...")
pothole_images, pothole_labels = load_and_preprocess_images(POTHOLES_DIR, label=1)

# Combine datasets
print("\n[3/3] COMBINING AND SPLITTING DATASET...")
all_images = np.array(normal_images + pothole_images, dtype=np.float32)
all_labels = np.array(normal_labels + pothole_labels, dtype=np.int32)

print(f"\nTotal images: {len(all_images)}")
print(f"  - Normal roads: {len(normal_images)}")
print(f"  - Potholes: {len(pothole_images)}")
print(f"  - Image shape: {all_images[0].shape}")

# Split into train, validation, and test sets
# 70% train, 15% validation, 15% test
X_train_val, X_test, y_train_val, y_test = train_test_split(
    all_images, all_labels, test_size=0.15, random_state=42, stratify=all_labels
)

X_train, X_val, y_train, y_val = train_test_split(
    X_train_val, y_train_val, test_size=0.15 / 0.85, random_state=42, stratify=y_train_val
)

print(f"\nDataset split:")
print(f"  - Training:   {len(X_train)} images ({len(X_train)/len(all_images)*100:.1f}%)")
print(f"  - Validation: {len(X_val)} images ({len(X_val)/len(all_images)*100:.1f}%)")
print(f"  - Test:       {len(X_test)} images ({len(X_test)/len(all_images)*100:.1f}%)")

# Save processed data
print(f"\nSaving processed data to {OUTPUT_DIR}/...")

np.savez_compressed(
    os.path.join(OUTPUT_DIR, "road_quality_data.npz"),
    X_train=X_train,
    y_train=y_train,
    X_val=X_val,
    y_val=y_val,
    X_test=X_test,
    y_test=y_test,
)

print(f"  ✓ Saved road_quality_data.npz")

# Save metadata
metadata = {
    "img_size": IMG_SIZE,
    "channels": CHANNELS,
    "total_images": len(all_images),
    "normal_count": len(normal_images),
    "pothole_count": len(pothole_images),
    "class_names": ["Normal Road", "Pothole"],
    "train_size": len(X_train),
    "val_size": len(X_val),
    "test_size": len(X_test),
}

joblib.dump(metadata, os.path.join(OUTPUT_DIR, "metadata.pkl"))
print(f"  ✓ Saved metadata.pkl")

# Create dataset statistics file
stats = f"""
ROAD QUALITY DATASET PREPROCESSING REPORT
{'=' * 60}

Dataset Statistics:
  Total Images: {len(all_images)}
  - Normal Roads: {len(normal_images)} ({len(normal_images)/len(all_images)*100:.1f}%)
  - Potholes: {len(pothole_images)} ({len(pothole_images)/len(all_images)*100:.1f}%)

Image Preprocessing:
  - Target Size: {IMG_SIZE}x{IMG_SIZE}
  - Channels: {CHANNELS} (RGB)
  - Normalization: Pixel values from [0, 255] to [0, 1]
  - Format: Float32

Data Split:
  - Training: {len(X_train)} images (70%)
  - Validation: {len(X_val)} images (15%)
  - Test: {len(X_test)} images (15%)

Output Files:
  ✓ road_quality_data.npz - Compressed numpy arrays
  ✓ metadata.pkl - Dataset metadata
  ✓ preprocessing_report.txt - This file

Class Distribution:
  Training:
    - Normal: {np.sum(y_train == 0)} images
    - Potholes: {np.sum(y_train == 1)} images

  Validation:
    - Normal: {np.sum(y_val == 0)} images
    - Potholes: {np.sum(y_val == 1)} images

  Test:
    - Normal: {np.sum(y_test == 0)} images
    - Potholes: {np.sum(y_test == 1)} images

Ready for model training!
"""

with open(os.path.join(OUTPUT_DIR, "preprocessing_report.txt"), "w") as f:
    f.write(stats)

print(f"  ✓ Saved preprocessing_report.txt")

print("\n" + "=" * 60)
print("✅ PREPROCESSING COMPLETE!")
print("=" * 60)
print(f"\nNext step: Run train_road_quality_model.py to train the model")
print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}/")
