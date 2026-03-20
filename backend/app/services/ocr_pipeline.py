import time
from pathlib import Path

from PIL import Image

from app.core.config import Settings
from app.core.model_registry import ModelRegistry
from app.services.classification import classify_crops
from app.services.detection import detect_boxes
from app.services.file_manager import write_output
from app.services.formatting import build_box_records, draw_visualization, format_text
from app.services.recognition import compute_indent_levels, ocr_crops


class OCRPipelineService:
    def __init__(self, registry: ModelRegistry, settings: Settings) -> None:
        self.registry = registry
        self.settings = settings

    def predict(self, image_path: Path, original_filename: str, request_id: str) -> dict:
        start = time.perf_counter()
        models = self.registry.get_models()
        image = Image.open(image_path).convert("RGB")

        boxes = detect_boxes(models.yolo, image, self.settings)
        classifications = classify_crops(
            models.resnet,
            models.resnet_transform,
            models.device,
            image,
            boxes,
        )

        boxes_for_ocr = [box for box, cls in zip(boxes, classifications) if cls["class"] != "crossed"]
        texts = ocr_crops(
            models.processor,
            models.trocr,
            models.device,
            image,
            boxes_for_ocr,
            self.settings,
        )
        indent_levels = compute_indent_levels(boxes_for_ocr, self.settings)
        recognized_text = format_text(texts, indent_levels, self.settings)
        visualization_bytes = draw_visualization(image, boxes, classifications)
        visualization_path = write_output("viz", ".png", visualization_bytes, self.settings)

        records = build_box_records(boxes, classifications, texts, indent_levels)
        return {
            "success": True,
            "filename": original_filename,
            "recognized_text": recognized_text,
            "boxes": records,
            "processing_time": round(time.perf_counter() - start, 4),
            "visualization_path": f"/static/outputs/{visualization_path.name}",
            "request_id": request_id,
            "error": None,
        }
