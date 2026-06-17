from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
from services.pdf_service import get_pdf_metadata
from services.image_service import extract_images_from_pdf

app = FastAPI()

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/health")
def health_check():
    return JSONResponse({"status": "ok"})


@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    pdf_path = UPLOAD_DIR / file.filename
    with pdf_path.open("wb") as buffer:
        buffer.write(await file.read())

    metadata = get_pdf_metadata(pdf_path)
    images = extract_images_from_pdf(pdf_path)

    return JSONResponse({
        "metadata": metadata,
        "images": images,
    })
