"""
PyTorch Data Loader for Cityscapes Dataset
Provides efficient data loading with augmentation for training and validation
"""

import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
import cv2
import numpy as np
from pathlib import Path
from PIL import Image
import random
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CityscapesDataset(Dataset):
    """
    Cityscapes Dataset for semantic segmentation
    Loads images with optional augmentation
    """
    
    def __init__(self, image_dir, transform=None, augment=False, image_size=(256, 512)):
        """
        Args:
            image_dir: Path to directory containing images
            transform: torchvision transforms to apply
            augment: Whether to apply data augmentation
            image_size: Target image size (H, W)
        """
        self.image_dir = Path(image_dir)
        self.image_paths = sorted(self.image_dir.glob('*.jpg')) + \
                          sorted(self.image_dir.glob('*.jpeg')) + \
                          sorted(self.image_dir.glob('*.png'))
        
        self.transform = transform
        self.augment = augment
        self.image_size = image_size
        
        logger.info(f"Loaded {len(self.image_paths)} images from {image_dir}")
        
        # Normalization parameters (calculated from training set)
        self.mean = np.array([85.31, 77.16, 86.89], dtype=np.float32)
        self.std = np.array([52.25, 46.7, 53.5], dtype=np.float32)
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        """Load and preprocess image"""
        img_path = self.image_paths[idx]
        
        # Load image (BGR format from OpenCV)
        img = cv2.imread(str(img_path))
        if img is None:
            logger.warning(f"Failed to load {img_path}, using zero image instead")
            img = np.zeros((*self.image_size, 3), dtype=np.uint8)
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Apply augmentation if training
        if self.augment:
            img = self._augment(img)
        
        # Ensure correct size
        if img.shape[:2] != self.image_size:
            img = cv2.resize(img, (self.image_size[1], self.image_size[0]))
        
        # Convert to tensor
        if self.transform:
            img = self.transform(img)
        else:
            # Default: convert to tensor and normalize
            img = Image.fromarray(img)
            img = transforms.ToTensor()(img)
            img = transforms.Normalize(
                mean=self.mean / 255.0,
                std=self.std / 255.0
            )(img)
        
        return img
    
    def _augment(self, img):
        """Apply data augmentation"""
        H, W = img.shape[:2]
        
        # Random horizontal flip (0.5 probability)
        if random.random() < 0.5:
            img = cv2.flip(img, 1)
        
        # Random vertical flip (0.3 probability)
        if random.random() < 0.3:
            img = cv2.flip(img, 0)
        
        # Random rotation (±15 degrees)
        if random.random() < 0.5:
            angle = random.uniform(-15, 15)
            M = cv2.getRotationMatrix2D((W/2, H/2), angle, 1.0)
            img = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
        
        # Random brightness adjustment
        if random.random() < 0.5:
            brightness = random.uniform(0.8, 1.2)
            img = cv2.convertScaleAbs(img, alpha=brightness, beta=0)
            img = np.clip(img, 0, 255).astype(np.uint8)
        
        # Random contrast adjustment
        if random.random() < 0.5:
            contrast = random.uniform(0.9, 1.1)
            img = cv2.convertScaleAbs(img, alpha=contrast, beta=0)
            img = np.clip(img, 0, 255).astype(np.uint8)
        
        # Random Gaussian blur
        if random.random() < 0.2:
            kernel_size = random.choice([3, 5, 7])
            img = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
        
        return img


class CityscapesDataManager:
    """
    Manages data loading for training and validation
    """
    
    def __init__(self, data_root, batch_size=32, num_workers=4, image_size=(256, 512)):
        """
        Args:
            data_root: Root directory containing 'train' and 'val' folders
            batch_size: Batch size for data loading
            num_workers: Number of workers for data loading
            image_size: Target image size (H, W)
        """
        self.data_root = Path(data_root)
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.image_size = image_size
        
        # Verify directories exist
        self.train_dir = self.data_root / 'train'
        self.val_dir = self.data_root / 'val'
        
        assert self.train_dir.exists(), f"Train directory not found: {self.train_dir}"
        assert self.val_dir.exists(), f"Val directory not found: {self.val_dir}"
        
        logger.info(f"Data root: {self.data_root}")
        logger.info(f"Batch size: {batch_size}")
        logger.info(f"Workers: {num_workers}")
    
    def get_train_loader(self):
        """Get training data loader with augmentation"""
        
        # Augmentation transforms
        train_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[85.31/255, 77.16/255, 86.89/255],
                std=[52.25/255, 46.7/255, 53.5/255]
            )
        ])
        
        train_dataset = CityscapesDataset(
            self.train_dir,
            transform=train_transform,
            augment=True,
            image_size=self.image_size
        )
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.batch_size,
            shuffle=True,
            num_workers=self.num_workers,
            pin_memory=True,
            drop_last=True
        )
        
        logger.info(f"Training batches: {len(train_loader)}")
        return train_loader
    
    def get_val_loader(self):
        """Get validation data loader without augmentation"""
        
        val_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[85.31/255, 77.16/255, 86.89/255],
                std=[52.25/255, 46.7/255, 53.5/255]
            )
        ])
        
        val_dataset = CityscapesDataset(
            self.val_dir,
            transform=val_transform,
            augment=False,
            image_size=self.image_size
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=self.num_workers,
            pin_memory=True
        )
        
        logger.info(f"Validation batches: {len(val_loader)}")
        return val_loader
    
    def get_train_val_loaders(self):
        """Get both train and validation loaders"""
        return self.get_train_loader(), self.get_val_loader()


def test_data_loading():
    """Test script to verify data loading works correctly"""
    
    logger.info("Testing Cityscapes Data Loading...")
    
    data_root = r"c:\Users\D Sai tejashwini\Downloads\Telegram Desktop\archive (1)\cityscapes_data\cityscapes_data\processed"
    
    # Initialize data manager
    dm = CityscapesDataManager(
        data_root=data_root,
        batch_size=8,
        num_workers=2
    )
    
    # Get loaders
    train_loader, val_loader = dm.get_train_val_loaders()
    
    # Test training loader
    logger.info("\n" + "="*60)
    logger.info("Testing Training Loader")
    logger.info("="*60)
    
    for batch_idx, images in enumerate(train_loader):
        logger.info(f"Batch {batch_idx+1}:")
        logger.info(f"  Shape: {images.shape}")
        logger.info(f"  Dtype: {images.dtype}")
        logger.info(f"  Min: {images.min():.4f}, Max: {images.max():.4f}")
        logger.info(f"  Mean: {images.mean():.4f}, Std: {images.std():.4f}")
        
        if batch_idx == 2:  # Test first 3 batches
            break
    
    # Test validation loader
    logger.info("\n" + "="*60)
    logger.info("Testing Validation Loader")
    logger.info("="*60)
    
    for batch_idx, images in enumerate(val_loader):
        logger.info(f"Batch {batch_idx+1}:")
        logger.info(f"  Shape: {images.shape}")
        logger.info(f"  Dtype: {images.dtype}")
        logger.info(f"  Min: {images.min():.4f}, Max: {images.max():.4f}")
        logger.info(f"  Mean: {images.mean():.4f}, Std: {images.std():.4f}")
        
        if batch_idx == 2:  # Test first 3 batches
            break
    
    logger.info("\n" + "="*60)
    logger.info("✓ Data loading test completed successfully!")
    logger.info("="*60)


if __name__ == "__main__":
    test_data_loading()
