from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
from services.pdf_service import get_pdf_metadata
from services.image_service import extract_images_from_pdf
from services.layout_service import analyze_pdf_layout, crop_visuals

app = FastAPI()

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health_get():
    return JSONResponse({
        "status": "healthy",
        "service": "python-visual-service"
    })


@app.post("/health")
def health_post():
    return JSONResponse({
        "status": "healthy",
        "service": "python-visual-service"
    })


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


@app.post("/analyze-layout")
async def analyze_layout(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    pdf_path = UPLOAD_DIR / file.filename
    with pdf_path.open("wb") as buffer:
        buffer.write(await file.read())

    layout_elements = analyze_pdf_layout(pdf_path)
    return JSONResponse({
        "layout": layout_elements,
    })


@app.post("/crop-visuals")
async def crop_visuals_endpoint(file: UploadFile = File(...)):
    """
    Crop visual regions (images, tables) from a PDF and save as PNG files.

    Validates that layout coordinates produce meaningful visual crops.
    Uses native PDF rendering (no OCR) with coordinate conversion from
    layout-model pixel space (200 DPI) to PDF native coordinates (points).

    Returns JSON with page_number, type, original coordinates, and saved image path.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    pdf_path = UPLOAD_DIR / file.filename
    with pdf_path.open("wb") as buffer:
        buffer.write(await file.read())

    # Create a subdirectory for this PDF's crops
    crop_output_dir = OUTPUT_DIR / Path(file.filename).stem
    crop_output_dir.mkdir(parents=True, exist_ok=True)

    visual_crops = crop_visuals(pdf_path, crop_output_dir)
    return JSONResponse({
        "visuals": visual_crops,
    })

