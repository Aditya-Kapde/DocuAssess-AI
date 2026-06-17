import fitz
from pathlib import Path


def get_pdf_metadata(pdf_path: Path) -> dict:
    with fitz.open(pdf_path) as doc:
        return {
            "total_pages": len(doc),
            "file_size": pdf_path.stat().st_size,
        }
