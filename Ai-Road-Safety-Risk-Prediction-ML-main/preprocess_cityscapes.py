"""
Cityscapes Dataset Preprocessing Script
Cleans, validates, and prepares the dataset for training
"""

import os
import cv2
import numpy as np
from pathlib import Path
import shutil
from tqdm import tqdm
import json
from PIL import Image
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CityscapesPreprocessor:
    def __init__(self, dataset_path):
        self.dataset_path = Path(dataset_path)
        self.train_path = self.dataset_path / 'train'
        self.val_path = self.dataset_path / 'val'
        self.output_path = self.dataset_path / 'processed'
        self.output_train = self.output_path / 'train'
        self.output_val = self.output_path / 'val'
        self.corrupted_path = self.output_path / 'corrupted'
        
        self.stats = {
            'total_images': 0,
            'valid_images': 0,
            'corrupted_images': 0,
            'removed_duplicates': 0,
            'image_shapes': {},
            'train_count': 0,
            'val_count': 0,
        }
        
    def setup_output_dirs(self):
        """Create output directories"""
        logger.info("Setting up output directories...")
        self.output_path.mkdir(exist_ok=True)
        self.output_train.mkdir(exist_ok=True)
        self.output_val.mkdir(exist_ok=True)
        self.corrupted_path.mkdir(exist_ok=True)
        logger.info("✓ Directories created")
    
    def is_valid_image(self, image_path):
        """Validate if image is readable and not corrupted"""
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                return False, "Cannot read image"
            
            if img.size == 0:
                return False, "Empty image"
            
            if len(img.shape) not in [2, 3]:
                return False, "Invalid dimensions"
            
            # Check if image has valid data
            if np.all(img == 0) or np.all(img == 255):
                return False, "Image is all zeros or all white"
            
            return True, "Valid"
        except Exception as e:
            return False, str(e)
    
    def get_image_shape(self, image_path):
        """Get image dimensions"""
        try:
            img = cv2.imread(str(image_path))
            if img is not None:
                return img.shape
            return None
        except:
            return None
    
    def copy_valid_image(self, src_path, dst_path):
        """Copy valid image to destination"""
        try:
            img = cv2.imread(str(src_path))
            if img is not None:
                cv2.imwrite(str(dst_path), img)
                return True
        except:
            pass
        return False
    
    def move_corrupted_image(self, src_path):
        """Move corrupted image to corrupted folder"""
        try:
            shutil.copy2(str(src_path), str(self.corrupted_path / src_path.name))
            return True
        except:
            return False
    
    def preprocess_split(self, split_name, split_path):
        """Process train or val split"""
        logger.info(f"\nProcessing {split_name} split...")
        
        if split_name == 'train':
            output_split = self.output_train
        else:
            output_split = self.output_val
        
        image_files = sorted(split_path.glob('*.jpg')) + sorted(split_path.glob('*.jpeg')) + \
                     sorted(split_path.glob('*.png')) + sorted(split_path.glob('*.JPG'))
        
        logger.info(f"Found {len(image_files)} images in {split_name} split")
        
        valid_count = 0
        corrupted_count = 0
        shape_distribution = {}
        
        for img_path in tqdm(image_files, desc=f"Processing {split_name}"):
            self.stats['total_images'] += 1
            
            # Validate image
            is_valid, reason = self.is_valid_image(img_path)
            
            if is_valid:
                # Get image shape
                shape = self.get_image_shape(img_path)
                if shape:
                    shape_key = f"{shape[0]}x{shape[1]}"
                    shape_distribution[shape_key] = shape_distribution.get(shape_key, 0) + 1
                    self.stats['image_shapes'][shape_key] = shape_distribution[shape_key]
                
                # Copy to output
                if self.copy_valid_image(img_path, output_split / img_path.name):
                    valid_count += 1
                    self.stats['valid_images'] += 1
                else:
                    corrupted_count += 1
                    self.stats['corrupted_images'] += 1
                    self.move_corrupted_image(img_path)
            else:
                corrupted_count += 1
                self.stats['corrupted_images'] += 1
                logger.warning(f"Corrupted: {img_path.name} - {reason}")
                self.move_corrupted_image(img_path)
        
        if split_name == 'train':
            self.stats['train_count'] = valid_count
        else:
            self.stats['val_count'] = valid_count
        
        logger.info(f"✓ {split_name}: {valid_count} valid | {corrupted_count} corrupted")
        logger.info(f"  Image shapes distribution: {shape_distribution}")
        
        return valid_count, corrupted_count
    
    def normalize_images(self, target_size=(256, 256)):
        """Normalize image sizes (optional)"""
        logger.info(f"\nNormalizing images to {target_size}...")
        
        for split_path in [self.output_train, self.output_val]:
            image_files = list(split_path.glob('*.*'))
            
            for img_path in tqdm(image_files, desc=f"Normalizing {split_path.name}"):
                try:
                    img = cv2.imread(str(img_path))
                    if img is not None:
                        # Resize maintaining aspect ratio with padding
                        h, w = img.shape[:2]
                        aspect = w / h
                        target_aspect = target_size[0] / target_size[1]
                        
                        if aspect > target_aspect:
                            new_w = target_size[0]
                            new_h = int(target_size[0] / aspect)
                        else:
                            new_h = target_size[1]
                            new_w = int(target_size[1] * aspect)
                        
                        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
                        
                        # Create canvas
                        canvas = np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)
                        y_offset = (target_size[1] - new_h) // 2
                        x_offset = (target_size[0] - new_w) // 2
                        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
                        
                        cv2.imwrite(str(img_path), canvas)
                except Exception as e:
                    logger.error(f"Error normalizing {img_path.name}: {e}")
    
    def validate_processed_dataset(self):
        """Quick count of processed images"""
        logger.info("\nCounting processed images...")
        
        train_count = len(list(self.output_train.glob('*.*')))
        val_count = len(list(self.output_val.glob('*.*')))
        
        logger.info(f"✓ Training set: {train_count} images")
        logger.info(f"✓ Validation set: {val_count} images")
        logger.info(f"✓ Total processed: {train_count + val_count}")
        
        return train_count, val_count
    
    def save_statistics(self):
        """Save preprocessing statistics"""
        stats_file = self.output_path / 'preprocessing_stats.json'
        
        # Add summary
        self.stats['summary'] = {
            'total_processed': self.stats['total_images'],
            'total_valid': self.stats['valid_images'],
            'total_corrupted': self.stats['corrupted_images'],
            'train_images': self.stats['train_count'],
            'val_images': self.stats['val_count'],
            'success_rate': f"{(self.stats['valid_images'] / max(self.stats['total_images'], 1)) * 100:.2f}%"
        }
        
        with open(stats_file, 'w') as f:
            json.dump(self.stats, f, indent=2)
        
        logger.info(f"\n✓ Statistics saved to {stats_file}")
        logger.info(f"\nPreprocessing Summary:")
        logger.info(f"  Total images: {self.stats['total_images']}")
        logger.info(f"  Valid images: {self.stats['valid_images']}")
        logger.info(f"  Corrupted images: {self.stats['corrupted_images']}")
        logger.info(f"  Success rate: {self.stats['summary']['success_rate']}")
        logger.info(f"  Train/Val split: {self.stats['train_count']}/{self.stats['val_count']}")
    
    def run(self, normalize=False):
        """Run complete preprocessing pipeline"""
        logger.info("="*60)
        logger.info("CITYSCAPES DATASET PREPROCESSING")
        logger.info("="*60)
        
        # Setup
        self.setup_output_dirs()
        
        # Process splits
        self.preprocess_split('train', self.train_path)
        self.preprocess_split('val', self.val_path)
        
        # Optionally normalize images
        if normalize:
            self.normalize_images()
        
        # Validate
        self.validate_processed_dataset()
        
        # Save statistics
        self.save_statistics()
        
        logger.info("\n" + "="*60)
        logger.info("✓ PREPROCESSING COMPLETE!")
        logger.info(f"✓ Processed dataset saved to: {self.output_path}")
        logger.info("="*60)


def main():
    dataset_path = r"c:\Users\D Sai tejashwini\Downloads\Telegram Desktop\archive (1)\cityscapes_data\cityscapes_data"
    
    preprocessor = CityscapesPreprocessor(dataset_path)
    preprocessor.run(normalize=False)  # Set to True if you want normalized sizes


if __name__ == "__main__":
    main()
