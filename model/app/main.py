from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import shutil
from app.model import predict_upload

app = FastAPI(title="Deepfake Detector API")

@app.post("/detect")
async def detect_deepfake(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "video/mp4", "video/quicktime", "video/x-msvideo"]:
        raise HTTPException(400, "Only jpg/png/mp4/mov/avi supported")

    is_video = file.content_type.startswith("video")

    with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            file_bytes = f.read()
        
        result = predict_upload(file_bytes, is_video)
        return result                     # ← Now matches your React frontend exactly
    finally:
        import os
        os.unlink(tmp_path)

@app.get("/")
def home():
    return {"message": "Deepfake Detector API ready! POST /detect with image/video"}