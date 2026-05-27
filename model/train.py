import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader, Subset
import torch.optim as optim
from torch.amp import autocast, GradScaler
from pathlib import Path
import time
import numpy as np
import cv2
import shutil
from tqdm import tqdm

# ====================== CONFIGURATION (TUNED FOR CORRECT PREDICTIONS) ======================
BATCH_SIZE = 64
EPOCHS_STAGE1 = 8          # Increased
EPOCHS_STAGE2 = 20         # Much longer fine-tuning
LR_STAGE1 = 0.0005         # Lower & more stable
LR_STAGE2 = 0.00005        # Very low for fine-tuning
VALIDATION_SPLIT = 0.15    # More training data
FAKE_WEIGHT_MULTIPLIER = 3.0  # ← CRITICAL: Makes model punish fake→real mistakes heavily
DATASET_ROOT = Path("sorted_train")
FINE_TUNE_EXISTING = True

# ====================== FOCAL LOSS (Better for hard fake examples) ======================
class FocalLoss(nn.Module):
    def __init__(self, alpha=0.75, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs, targets):
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = (self.alpha * (1 - pt) ** self.gamma * ce_loss).mean()
        return focal_loss

# ====================== FRAME EXTRACTION ======================
def extract_frames(video_path: str, output_dir: Path, max_frames=12):
    cap = cv2.VideoCapture(video_path)
    count = 0
    stem = Path(video_path).stem
    while cap.isOpened() and count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if count % 2 == 0:
            frame_path = output_dir / f"{stem}_frame{count}.jpg"
            cv2.imwrite(str(frame_path), frame)
        count += 1
    cap.release()

# ====================== PREPARE DATASET ======================
def prepare_dataset():
    print("🔄 Preparing dataset from sorted_train...")
    PREPARED_DIR = Path("prepared_dataset")
    if PREPARED_DIR.exists():
        shutil.rmtree(PREPARED_DIR)
    PREPARED_DIR.mkdir(exist_ok=True)
    (PREPARED_DIR / "real").mkdir(exist_ok=True)
    (PREPARED_DIR / "fake").mkdir(exist_ok=True)

    # Real videos
    real_videos = DATASET_ROOT / "real_videos"
    if real_videos.exists():
        for file in tqdm(list(real_videos.iterdir()), desc="Real videos"):
            if file.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv"]:
                extract_frames(str(file), PREPARED_DIR / "real")

    # Fake videos
    fake_videos = DATASET_ROOT / "fake_videos"
    if fake_videos.exists():
        for file in tqdm(list(fake_videos.iterdir()), desc="Fake videos"):
            if file.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv"]:
                extract_frames(str(file), PREPARED_DIR / "fake")

    images_folder = DATASET_ROOT / "images"
    if images_folder.exists() and list(images_folder.iterdir()):
        print(f"⚠️  Note: '{images_folder}' folder exists but was ignored (no labels).")

    real_count = len(list((PREPARED_DIR / "real").iterdir()))
    fake_count = len(list((PREPARED_DIR / "fake").iterdir()))
    print(f"✅ Prepared dataset ready!")
    print(f"   Real frames  : {real_count:,}")
    print(f"   Fake frames  : {fake_count:,}")
    print(f"   Total frames : {real_count + fake_count:,}")
    return PREPARED_DIR

# ====================== MAIN ======================
def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🚀 Training on: {device}")
    if device.type == "cuda":
        print(f"   GPU: {torch.cuda.get_device_name(0)}")

    prepared_root = prepare_dataset()
    full_dataset = datasets.ImageFolder(prepared_root, transform=None)

    print(f"✅ Loaded {len(full_dataset):,} labeled frames")
    print(f"   Classes: {full_dataset.classes}")

    # Stratified split
    targets = np.array(full_dataset.targets)
    train_idx, val_idx = [], []
    for cls in range(2):
        cls_idx = np.where(targets == cls)[0]
        n_val = int(len(cls_idx) * VALIDATION_SPLIT)
        np.random.seed(42)
        np.random.shuffle(cls_idx)
        val_idx.extend(cls_idx[:n_val])
        train_idx.extend(cls_idx[n_val:])

    train_idx = np.array(train_idx)
    val_idx = np.array(val_idx)
    print(f"📊 Split: {len(train_idx):,} training, {len(val_idx):,} validation")

    # Stronger transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(25),
        transforms.ColorJitter(brightness=0.5, contrast=0.5, saturation=0.5),
        transforms.RandomAffine(degrees=10, translate=(0.15, 0.15)),
        transforms.GaussianBlur(kernel_size=3),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_dataset = Subset(full_dataset, train_idx)
    val_dataset = Subset(full_dataset, val_idx)
    train_dataset.dataset.transform = train_transform
    val_dataset.dataset.transform = val_transform

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    # Model
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)

    if FINE_TUNE_EXISTING and Path("model.pth").exists():
        model.load_state_dict(torch.load("model.pth", map_location=device, weights_only=True))
        print("🔄 Loaded existing model.pth for fine-tuning")

    model = model.to(device)

    # Heavy weight on fake class
    class_counts = np.bincount(targets[train_idx])
    class_weights = torch.tensor([1.0, FAKE_WEIGHT_MULTIPLIER], dtype=torch.float32).to(device)
    print(f"⚖️  Class weights (Real:1.0 | Fake:{FAKE_WEIGHT_MULTIPLIER}): {class_weights.cpu().numpy()}")

    criterion = FocalLoss(alpha=0.75, gamma=2.0)   # ← Much better for fake detection
    scaler = GradScaler(device=device.type) if device.type == "cuda" else None
    optimizer = optim.AdamW(model.parameters(), lr=LR_STAGE1, weight_decay=1e-4)

    # Two-stage training
    def train_stage(epochs, lr, freeze_backbone=True):
        nonlocal optimizer
        if freeze_backbone:
            for param in model.features.parameters():
                param.requires_grad = False
            print("❄️  Stage 1: Training only classifier head...")
        else:
            for param in model.features.parameters():
                param.requires_grad = True
            print("🔥 Stage 2: Fine-tuning entire backbone...")

        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

        best_val_acc = 0.0
        patience = 5
        no_improve = 0

        for epoch in range(epochs):
            model.train()
            running_loss = 0.0
            correct = 0
            total = 0

            for inputs, labels in train_loader:
                inputs, labels = inputs.to(device, non_blocking=True), labels.to(device, non_blocking=True)
                optimizer.zero_grad()

                if device.type == "cuda":
                    with autocast(device_type='cuda', dtype=torch.float16):
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                    scaler.scale(loss).backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    optimizer.step()

                running_loss += loss.item()
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

            train_acc = 100. * correct / total
            train_loss = running_loss / len(train_loader)
            scheduler.step()

            # Validation
            model.eval()
            val_correct = 0
            val_total = 0
            with torch.no_grad():
                for inputs, labels in val_loader:
                    inputs, labels = inputs.to(device), labels.to(device)
                    outputs = model(inputs)
                    _, predicted = outputs.max(1)
                    val_total += labels.size(0)
                    val_correct += predicted.eq(labels).sum().item()
            val_acc = 100. * val_correct / val_total

            print(f"Epoch {epoch+1:2d}/{epochs} | Loss: {train_loss:.4f} | "
                  f"Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%")

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                torch.save(model.state_dict(), "model_best.pth")
                no_improve = 0
                print(f"   💾 New best model saved!")
            else:
                no_improve += 1
                if no_improve >= patience:
                    print("Early stopping triggered!")
                    break

    # Run training
    train_stage(EPOCHS_STAGE1, LR_STAGE1, freeze_backbone=True)
    train_stage(EPOCHS_STAGE2, LR_STAGE2, freeze_backbone=False)

    torch.save(model.state_dict(), "model.pth")
    print("\n🎉 TRAINING COMPLETED SUCCESSFULLY!")
    print("   Best model saved as → model_best.pth")
    print("   Final model saved as → model.pth")
    print("\nRestart your FastAPI backend and test both real & fake images/videos.")

if __name__ == "__main__":
    main()