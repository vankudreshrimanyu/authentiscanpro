import cv2
import numpy as np
from torchvision import transforms
import torch

def detect_and_crop_face(frame):
    """Improved face detection with fallback"""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    if len(faces) > 0:
        x, y, w, h = faces[0]
        return frame[y:y+h, x:x+w]
    return frame  # fallback to full frame

def preprocess_image(image):
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

def predict_frame(model, frame, device):
    face = detect_and_crop_face(frame)
    tensor = preprocess_image(face).to(device)
    with torch.no_grad():
        output = model(tensor)
        prob = torch.softmax(output, dim=1)[0]
    return prob  # returns tensor of shape (2,)