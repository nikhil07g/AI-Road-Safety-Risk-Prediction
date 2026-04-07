"""
Semantic Segmentation Model Training Script
Cityscapes Dataset Training for Safe Drive AI

This script trains a semantic segmentation model on the preprocessed Cityscapes dataset.
The model learns to segment road scenes into semantic classes.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from pathlib import Path
import logging
import json
from datetime import datetime
from tqdm import tqdm
import numpy as np

from cityscapes_dataloader import CityscapesDataManager, CityscapesDataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimpleSegmentationModel(nn.Module):
    """
    Simple semantic segmentation model for Cityscapes dataset
    Uses encoder-decoder architecture with skip connections
    """
    
    def __init__(self, num_classes=19, in_channels=3):
        super(SimpleSegmentationModel, self).__init__()
        self.num_classes = num_classes
        
        # Encoder (simplified ResNet-like structure)
        self.enc1 = nn.Sequential(
            nn.Conv2d(in_channels, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True)
        )
        self.pool1 = nn.MaxPool2d(2, 2)
        
        self.enc2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True)
        )
        self.pool2 = nn.MaxPool2d(2, 2)
        
        self.enc3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True)
        )
        self.pool3 = nn.MaxPool2d(2, 2)
        
        # Middle
        self.middle = nn.Sequential(
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True)
        )
        
        # Decoder
        self.dec3 = nn.Sequential(
            nn.Conv2d(512 + 256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True)
        )
        self.upsample3 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        
        self.dec2 = nn.Sequential(
            nn.Conv2d(256 + 128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True)
        )
        self.upsample2 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        
        self.dec1 = nn.Sequential(
            nn.Conv2d(128 + 64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True)
        )
        self.upsample1 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=False)
        
        # Final output
        self.final = nn.Conv2d(64, num_classes, kernel_size=1)
    
    def forward(self, x):
        # Encoder with skip connections
        enc1 = self.enc1(x)
        x = self.pool1(enc1)
        
        enc2 = self.enc2(x)
        x = self.pool2(enc2)
        
        enc3 = self.enc3(x)
        x = self.pool3(enc3)
        
        # Middle
        x = self.middle(x)
        
        # Decoder with skip connections
        x = self.upsample3(x)
        x = torch.cat([x, enc3], dim=1)
        x = self.dec3(x)
        
        x = self.upsample2(x)
        x = torch.cat([x, enc2], dim=1)
        x = self.dec2(x)
        
        x = self.upsample1(x)
        x = torch.cat([x, enc1], dim=1)
        x = self.dec1(x)
        
        # Final output
        x = self.final(x)
        return x


class SegmentationTrainer:
    """Training wrapper for semantic segmentation models"""
    
    def __init__(self, model, train_loader, val_loader, device, config):
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.config = config
        
        # Setup training components
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.Adam(
            model.parameters(),
            lr=config['learning_rate'],
            weight_decay=config['weight_decay']
        )
        self.scheduler = optim.lr_scheduler.StepLR(
            self.optimizer,
            step_size=config['scheduler_step'],
            gamma=config['scheduler_gamma']
        )
        
        # Metrics storage
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'val_miou': [],
            'learning_rates': []
        }
        self.best_miou = 0
    
    def train_epoch(self):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        num_batches = 0
        
        pbar = tqdm(self.train_loader, desc="Training")
        for images in pbar:
            images = images.to(self.device)
            
            # Dummy targets for demonstration (replace with real segmentation targets)
            batch_size = images.shape[0]
            targets = torch.randint(0, 19, (batch_size, 256, 512)).to(self.device)
            
            # Forward
            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, targets)
            
            # Backward
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
            pbar.set_postfix({'loss': loss.item():.4f})
        
        avg_loss = total_loss / num_batches
        self.history['train_loss'].append(avg_loss)
        return avg_loss
    
    @torch.no_grad()
    def validate(self):
        """Validate the model"""
        self.model.eval()
        total_loss = 0
        num_batches = 0
        
        pbar = tqdm(self.val_loader, desc="Validating")
        for images in pbar:
            images = images.to(self.device)
            
            # Dummy targets for demonstration
            batch_size = images.shape[0]
            targets = torch.randint(0, 19, (batch_size, 256, 512)).to(self.device)
            
            outputs = self.model(images)
            loss = self.criterion(outputs, targets)
            
            total_loss += loss.item()
            num_batches += 1
            pbar.set_postfix({'loss': loss.item():.4f})
        
        avg_loss = total_loss / num_batches
        self.history['val_loss'].append(avg_loss)
        
        return avg_loss
    
    def train(self, num_epochs):
        """Train for specified number of epochs"""
        logger.info(f"Starting training for {num_epochs} epochs")
        logger.info(f"Device: {self.device}")
        logger.info(f"Train batches: {len(self.train_loader)}, Val batches: {len(self.val_loader)}")
        
        for epoch in range(num_epochs):
            logger.info(f"\n{'='*60}")
            logger.info(f"Epoch {epoch+1}/{num_epochs}")
            logger.info(f"{'='*60}")
            
            # Train
            train_loss = self.train_epoch()
            logger.info(f"Train Loss: {train_loss:.4f}")
            
            # Validate
            val_loss = self.validate()
            logger.info(f"Val Loss: {val_loss:.4f}")
            
            # Learning rate schedule
            self.scheduler.step()
            current_lr = self.optimizer.param_groups[0]['lr']
            self.history['learning_rates'].append(current_lr)
            logger.info(f"Learning Rate: {current_lr:.6f}")
            
            # Save best model
            if val_loss < (self.history['val_loss'][0] if len(self.history['val_loss']) == 1 else min(self.history['val_loss'][:-1])):
                self.save_checkpoint(f"best_model_epoch_{epoch+1}.pth")
                logger.info(f"✓ Saved best model (Val Loss: {val_loss:.4f})")
        
        logger.info("\n" + "="*60)
        logger.info("Training completed!")
        logger.info("="*60)
        
        return self.history
    
    def save_checkpoint(self, filename):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': len(self.history['train_loss']),
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'config': self.config,
            'history': self.history
        }
        torch.save(checkpoint, filename)
        logger.info(f"Checkpoint saved: {filename}")
    
    def load_checkpoint(self, filename):
        """Load model checkpoint"""
        checkpoint = torch.load(filename, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        self.history = checkpoint['history']
        logger.info(f"Checkpoint loaded: {filename}")


def main():
    """Main training script"""
    
    # Configuration
    config = {
        'data_root': r'c:\Users\D Sai tejashwini\Downloads\Telegram Desktop\archive (1)\cityscapes_data\cityscapes_data\processed',
        'batch_size': 32,
        'num_workers': 4,
        'num_epochs': 50,
        'learning_rate': 1e-3,
        'weight_decay': 1e-4,
        'scheduler_step': 10,
        'scheduler_gamma': 0.5,
        'num_classes': 19,  # Cityscapes has 19 semantic classes
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    }
    
    logger.info("="*60)
    logger.info("Safe Drive AI - Segmentation Model Training")
    logger.info("="*60)
    logger.info(f"Configuration:")
    for key, value in config.items():
        logger.info(f"  {key}: {value}")
    
    # Check data
    data_root = Path(config['data_root'])
    if not data_root.exists():
        logger.error(f"Data root not found: {data_root}")
        return
    
    # Setup data loaders
    logger.info("\nSetting up data loaders...")
    dm = CityscapesDataManager(
        data_root=str(data_root),
        batch_size=config['batch_size'],
        num_workers=config['num_workers'],
        image_size=(256, 512)
    )
    train_loader, val_loader = dm.get_train_val_loaders()
    
    # Create model
    logger.info(f"Creating model (device: {config['device']})...")
    model = SimpleSegmentationModel(
        num_classes=config['num_classes'],
        in_channels=3
    )
    
    # Count parameters
    num_params = sum(p.numel() for p in model.parameters())
    logger.info(f"Model parameters: {num_params:,}")
    
    # Create trainer
    trainer = SegmentationTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        device=config['device'],
        config=config
    )
    
    # Train
    logger.info("\nStarting training...")
    history = trainer.train(config['num_epochs'])
    
    # Save final model
    trainer.save_checkpoint("final_segmentation_model.pth")
    
    # Save training history
    history_file = f"training_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(history_file, 'w') as f:
        # Convert numpy arrays to lists for JSON serialization
        history_json = {
            k: [float(v) if isinstance(v, (np.floating, float)) else v for v in val_list]
            for k, val_list in history.items()
        }
        json.dump(history_json, f, indent=2)
    logger.info(f"Training history saved: {history_file}")
    
    logger.info("\n" + "="*60)
    logger.info("Training Pipeline Complete!")
    logger.info("="*60)
    logger.info(f"\nResults:")
    logger.info(f"  Final Train Loss: {history['train_loss'][-1]:.4f}")
    logger.info(f"  Final Val Loss: {history['val_loss'][-1]:.4f}")
    logger.info(f"  Best Val Loss: {min(history['val_loss']):.4f}")
    logger.info(f"\nCheckpoints saved:")
    logger.info(f"  - final_segmentation_model.pth")
    logger.info(f"  - best_model_epoch_*.pth")
    logger.info(f"  - {history_file}")


if __name__ == "__main__":
    main()
