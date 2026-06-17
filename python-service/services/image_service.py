import fitz
from pathlib import Path


def extract_images_from_pdf(pdf_path: Path) -> list:
    images = []
    with fitz.open(pdf_path) as doc:
        for page_index, page in enumerate(doc, start=1):
            image_list = page.get_images(full=True)
            for image_index, image_info in enumerate(image_list, start=1):
                xref = image_info[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                image_name = f"page_{page_index}_img_{image_index}.{image_ext}"
                output_path = pdf_path.parent.parent / "output" / image_name
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as image_file:
                    image_file.write(image_bytes)

                images.append({
                    "page": page_index,
                    "image_index": image_index,
                    "image_id": f"img_{page_index}_{image_index}",
                    "path": str(output_path),
                    "width": base_image["width"],
                    "height": base_image["height"],
                })
    return images
