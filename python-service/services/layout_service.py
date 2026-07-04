from pathlib import Path
from typing import List, Dict
import os

import fitz  # PyMuPDF

from unstructured.partition.pdf import document_to_element_list
from unstructured.documents.elements import Element, Image, Table
from unstructured_inference.inference.layout import process_file_with_model


def _normalize_element(element: Element, page_number: int) -> dict:
    element_type = element.__class__.__name__.lower()
    if element_type == "figure":
        element_type = "figure"
    elif element_type == "image":
        element_type = "image"
    elif element_type == "table":
        element_type = "table"
    else:
        element_type = element_type

    coordinates = None
    if hasattr(element, "metadata") and getattr(element.metadata, "coordinates", None):
        points = element.metadata.coordinates.points
        if points:
            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            coordinates = {
                "x0": min(xs),
                "y0": min(ys),
                "x1": max(xs),
                "y1": max(ys),
            }
    elif hasattr(element, "x_0") and hasattr(element, "y_0") and hasattr(element, "x_1") and hasattr(element, "y_1"):
        coordinates = {
            "x0": element.x_0,
            "y0": element.y_0,
            "x1": element.x_1,
            "y1": element.y_1,
        }

    text = getattr(element, "text", None)
    if text is None:
        text = getattr(element, "content", None)

    return {
        "type": element_type,
        "page_number": page_number,
        "text": text,
        "coordinates": coordinates,
    }


def analyze_pdf_layout(pdf_path: Path) -> List[dict]:
    elements: List[dict] = []

    # Use unstructured_inference model-based PDF layout detection only.
    # This avoids OCR entirely by extracting page layout regions directly from
    # the PDF file with the native layout model. This keeps the endpoint
    # focused on visual-layout analysis for tables, figures, images, and diagrams.
    try:
        document_layout = process_file_with_model(
            filename=str(pdf_path),
            model_name=None,
            is_image=False,
            pdf_image_dpi=200,
            pdf_render_max_pixels_per_page=10_000_000,
            password=None,
    )

    except TypeError:
        document_layout = process_file_with_model(
            filename=str(pdf_path),
            model_name=None,
            is_image=False,
            pdf_image_dpi=200,
            password=None,
        )

    # Convert the layout model output into unstructured elements with coordinates.
    document_elements = document_to_element_list(
        document_layout,
        sortable=False,
        include_page_breaks=False,
        starting_page_number=1,
        source_format="html",
    )

    for element in document_elements:
        # Page number can be stored in multiple locations depending on how the
        # element was constructed. `document_to_element_list` sets
        # `element.metadata.page_number` (see unstructured.documents.elements.ElementMetadata).
        # Older code looked for attributes on the element itself which may be None.
        page_number = None
        # Preferred: check metadata.page_number
        if hasattr(element, "metadata") and getattr(element.metadata, "page_number", None) is not None:
            page_number = element.metadata.page_number
        # Fallbacks: preserve previous checks for compatibility
        if page_number is None:
            page_number = getattr(element, "page_number", None)
        if page_number is None:
            page_number = getattr(element, "page", None)

        normalized = _normalize_element(element, page_number)
        elements.append(normalized)

    return elements


def crop_visuals(pdf_path: Path, output_dir: Path) -> List[dict]:
    """
    Crop visual regions (images, tables) from a PDF and save as PNG files.

    Coordinate Conversion:
    - Layout model detects regions at 200 DPI on rendered images (pixel space).
    - PyMuPDF operates in PDF native coordinates (points, 1/72 inch).
    - Conversion: pdf_coord = pixel_coord * (72 / 200) ≈ pixel_coord * 0.36
    - Y-coordinate must be flipped: pdf_y = page_height - image_y

    Args:
        pdf_path: Path to input PDF file
        output_dir: Directory to save cropped PNG images

    Returns:
        List of dicts with page_number, type, coordinates, and image_path
    """
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Analyze layout to get visual regions
    layout_elements = analyze_pdf_layout(pdf_path)

    # Step 2: Filter for images and tables
    visual_elements = [
        el for el in layout_elements
        if el["type"] in ["image", "table"]
    ]

    # Step 3: Open PDF with PyMuPDF
    pdf_doc = fitz.open(str(pdf_path))

    results = []
    visual_count = {}  # Track count of visuals per page for naming

    # Step 4: For each visual element, crop and save
    for visual in visual_elements:
        page_num = visual["page_number"]
        element_type = visual["type"]
        coords = visual["coordinates"]

        # Initialize counter for this page if needed
        if page_num not in visual_count:
            visual_count[page_num] = {}

        if element_type not in visual_count[page_num]:
            visual_count[page_num][element_type] = 0

        visual_count[page_num][element_type] += 1
        visual_idx = visual_count[page_num][element_type]

        # Get the PDF page (0-indexed)
        page = pdf_doc[page_num - 1]

        # Get page dimensions to calculate conversion factor
        # PyMuPDF page height in points
        page_height_points = page.rect.height

        # The layout model rendered at 200 DPI, so we need to know the image height
        # to properly flip y-coordinates. We can calculate this from the PDF's media box
        # and knowing it was rendered at 200 DPI.
        # PDF is typically 72 DPI by default. At 200 DPI rendering:
        # rendered_height_pixels = page_height_points * (200 / 72)
        rendered_height_pixels = page_height_points * (200 / 72)

        # Coordinate conversion: pixel -> point
        # Also flip y-coordinates (image space has y=0 at top, PDF space at bottom)
        dpi = 200
        conversion_factor = 72 / dpi  # ≈ 0.36

        x0_px = coords["x0"]
        y0_px = coords["y0"]
        x1_px = coords["x1"]
        y1_px = coords["y1"]

        # Convert to PDF points
        x0_pt = x0_px * conversion_factor
        x1_pt = x1_px * conversion_factor

        # Flip y-coordinates: pdf_y = rendered_height - image_y
        # (top of page in image = bottom of page in PDF)
        y1_pt = (rendered_height_pixels - y0_px) * conversion_factor
        y0_pt = (rendered_height_pixels - y1_px) * conversion_factor

        # Filtering rules operate in pixel space (rendered at `dpi`)
        width_px = max(0, x1_px - x0_px)
        height_px = max(0, y1_px - y0_px)
        area_px = width_px * height_px

        # Determine location percentiles relative to rendered image height
        top_percent = y0_px / rendered_height_pixels if rendered_height_pixels > 0 else 0
        bottom_percent = y1_px / rendered_height_pixels if rendered_height_pixels > 0 else 0

        # Apply discard rules
        discard_reasons: List[str] = []
        if width_px < 200:
            discard_reasons.append(f"width<{200}px")
        if height_px < 100:
            discard_reasons.append(f"height<{100}px")
        if area_px < 30000:
            discard_reasons.append(f"area<{30000}px^2")
        # top 15% or bottom 10% of page
        if top_percent < 0.15:
            discard_reasons.append("in_top_15%")
        if bottom_percent > 0.90:
            discard_reasons.append("in_bottom_10%")

        kept = len(discard_reasons) == 0
        confidence: Dict[str, object] = {
            "kept": kept,
            "reasons": [] if kept else discard_reasons,
        }

        image_path_value = None
        # Only crop if region kept after filtering
        if kept:
            # Create rect in PyMuPDF format (x0, y0, x1, y1)
            rect = fitz.Rect(x0_pt, y0_pt, x1_pt, y1_pt)

            # Clip to page bounds to avoid out-of-range errors
            rect = rect.intersect(page.rect)

            if not rect.is_empty:
                # Crop and save as PNG
                pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(1, 1))
                image_filename = f"page_{page_num}_{element_type}_{visual_idx}.png"
                image_path = output_dir / image_filename
                pix.save(str(image_path))
                image_path_value = str(image_path)

        # Record result (keep original coordinates for reference)
        results.append({
            "page_number": page_num,
            "type": element_type,
            "coordinates": coords,
            "image_path": image_path_value,
            "confidence": confidence,
        })

    pdf_doc.close()
    return results

