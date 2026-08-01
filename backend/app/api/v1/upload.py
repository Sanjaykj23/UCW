import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, File, UploadFile
from app.core.config import settings

router = APIRouter(prefix="/upload", tags=["Uploads"])

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="INVALID_FILE_TYPE: File must be an image")

    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = settings.UPLOADS_DIR / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{unique_filename}"}
