import torch
from torchvision import models
import cv2
import numpy as np
from pathlib import Path
from app.utils import predict_frame

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_model():
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, 2)  # real / fake
    model_path = Path("model_best.pth") if Path("model_best.pth").exists() else Path("model.pth")
    model.load_state_dict(torch.load(model_path, map_location=DEVICE, weights_only=True))
    model.eval()
    model.to(DEVICE)
    print(f"✅ Loaded model: {model_path} on {DEVICE}")
    return model

MODEL = load_model()

def predict_upload(file_bytes: bytes, is_video: bool):
    fake_probs = []
    frames_analyzed = 0

    if not is_video:
        # === IMAGE ===
        nparr = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Invalid image")
        
        prob = predict_frame(MODEL, frame, DEVICE)
        fake_probs.append(prob[1].item())
        frames_analyzed = 1

    else:
        # === VIDEO - Improved sampling (15 frames) ===
        with open("temp_video.mp4", "wb") as f:
            f.write(file_bytes)
        
        cap = cv2.VideoCapture("temp_video.mp4")
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = max(1, total_frames // 15)  # sample ~15 frames
        
        frame_idx = 0
        while cap.isOpened() and len(fake_probs) < 15:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_interval == 0:
                prob = predict_frame(MODEL, frame, DEVICE)
                fake_probs.append(prob[1].item())
                frames_analyzed += 1
            frame_idx += 1
        cap.release()
        
        # Clean up temp file
        import os
        if os.path.exists("temp_video.mp4"):
            os.unlink("temp_video.mp4")

    if not fake_probs:
        raise ValueError("No valid frames detected")

    # === FINAL DECISION (Video-specific fix) ===
    avg_fake = sum(fake_probs) / len(fake_probs)
    
    # Lower threshold for videos to catch more fakes
    if is_video:
        is_fake = avg_fake > 0.42          # ← This is the key fix
        confidence = max(avg_fake, 1 - avg_fake)
    else:
        is_fake = avg_fake > 0.50
        confidence = max(avg_fake, 1 - avg_fake)

    prediction = "FAKE" if is_fake else "REAL"

    return {
        "prediction": prediction,
        "confidence": round(float(confidence), 4),   # 0.0 - 1.0 (frontend multiplies by 100)
        "frames_analyzed": frames_analyzed,
        "fake_probability": round(avg_fake * 100, 2)  # bonus field
    }