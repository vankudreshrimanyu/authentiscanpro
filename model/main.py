from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import cv2
import numpy as np
import tempfile
import os
import gdown

from pathlib import Path

app = Flask(__name__)
CORS(app)

# ---------- CONFIG ----------
MODEL_PATH = "model_best.pth"

if not os.path.exists(MODEL_PATH):
    print("⬇️ Downloading model from Google Drive...")
    url = "https://drive.google.com/uc?id=1DR7EPcwWrZkQpJufAEoM6K0wChOuA8_T"
    gdown.download(url, MODEL_PATH, quiet=False)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CLASS_NAMES = ["fake", "real"]   # adjust if needed
NUM_FRAMES_PER_VIDEO = 10        # number of frames to sample

# Preprocessing (same as training)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# ---------- LOAD MODEL ----------
model = models.efficientnet_b0(weights=None)
model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASS_NAMES))
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
model.to(DEVICE)
model.eval()
print(f"✅ Model loaded on {DEVICE}, classes: {CLASS_NAMES}")

# ---------- HELPER: extract frames from video ----------
def extract_frames(video_bytes, num_frames=NUM_FRAMES_PER_VIDEO):
    """Save video bytes to temp file, extract frames, return list of PIL Images."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames == 0:
        os.unlink(tmp_path)
        return []
    indices = np.linspace(0, total_frames-1, num_frames, dtype=int)
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            frames.append(pil_img)
    cap.release()
    os.unlink(tmp_path)
    return frames

# ---------- HELPER: predict on a single image (PIL) ----------
def predict_image(pil_img):
    input_tensor = transform(pil_img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        out = model(input_tensor)
        probs = torch.softmax(out[0], dim=0)
    return probs.cpu().numpy()

# ---------- ROUTES ----------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "ok",
        "message": "Deepfake Detection API (images + videos)",
        "model_classes": CLASS_NAMES
    })

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    filename = file.filename.lower()
    file_bytes = file.read()

    # Determine file type
    is_video = filename.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm'))
    is_image = filename.endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp'))

    if not (is_image or is_video):
        return jsonify({"error": "Unsupported file type. Use image or video."}), 400

    try:
        if is_image:
            # Single image prediction
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            probs = predict_image(img)
            pred_idx = np.argmax(probs)
            confidence = probs[pred_idx]
            return jsonify({
                "prediction": CLASS_NAMES[pred_idx],
                "confidence": round(float(confidence), 4),
                "probabilities": {
                    CLASS_NAMES[i]: round(float(probs[i]), 4)
                    for i in range(len(CLASS_NAMES))
                }
            })
        else:
            # Video: sample frames and average probabilities
            frames = extract_frames(file_bytes)
            if not frames:
                return jsonify({"error": "Could not extract frames from video"}), 400
            # Average probabilities across frames
            avg_probs = np.zeros(len(CLASS_NAMES))
            for frame in frames:
                probs = predict_image(frame)
                avg_probs += probs
            avg_probs /= len(frames)
            pred_idx = np.argmax(avg_probs)
            confidence = avg_probs[pred_idx]
            return jsonify({
                "prediction": CLASS_NAMES[pred_idx],
                "confidence": round(float(confidence), 4),
                "probabilities": {
                    CLASS_NAMES[i]: round(float(avg_probs[i]), 4)
                    for i in range(len(CLASS_NAMES))
                },
                "frames_analyzed": len(frames)
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🌐 Starting Flask server on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)