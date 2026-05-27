from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

app = Flask(__name__)
CORS(app)  # Allow React frontend to call this API

# ---------- CONFIG ----------
MODEL_PATH = "model.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# Must match the order your training used (check your dataset folders)
CLASS_NAMES = ["fake", "real"]   # change if your folders were ["real","fake"]

# Preprocessing (same as training, no augmentations)
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

# ---------- ROUTES ----------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "ok",
        "message": "Deepfake Detection API",
        "model_classes": CLASS_NAMES
    })

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    file = request.files["file"]
    if not file.filename.lower().endswith(('.png','.jpg','.jpeg')):
        return jsonify({"error": "Image only"}), 400
    try:
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
        input_tensor = transform(img).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            out = model(input_tensor)
            probs = torch.softmax(out[0], dim=0)
            pred_idx = torch.argmax(probs).item()
            confidence = probs[pred_idx].item()
        return jsonify({
            "prediction": CLASS_NAMES[pred_idx],
            "confidence": round(confidence, 4),
            "probabilities": {c: round(p.item(),4) for c,p in zip(CLASS_NAMES, probs)}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)