import time

from PIL import Image

from app.core.config import Settings
from app.core.model_registry import ModelRegistry
from app.services.classification import classify_crops
from app.services.detection import detect_boxes
from app.services.file_manager import write_output
from app.services.formatting import build_box_records, draw_visualization, format_text
from app.services.recognition import compute_indent_levels, ocr_crops
from app.utils.image_utils import downscale_image


class OCRPipelineService:
    def __init__(self, registry: ModelRegistry, settings: Settings) -> None:
        self.registry = registry
        self.settings = settings

    def predict(self, image: Image.Image, original_filename: str, request_id: str, inference_mode: str = "local") -> dict:
        started = time.perf_counter()
        timings: dict[str, float] = {}

        stage_started = time.perf_counter()
        models = self.registry.get_models()
        timings["model_fetch"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        image = downscale_image(image, self.settings.max_image_dim)
        timings["preprocess"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes = detect_boxes(models.yolo, image, self.settings)
        timings["detection"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        classifications = classify_crops(
            models.resnet,
            models.resnet_transform,
            models.device,
            image,
            boxes,
        )
        timings["classification"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes_for_ocr = [box for box, cls in zip(boxes, classifications) if cls["class"] != "crossed"]
        texts = ocr_crops(
            models.processor,
            models.trocr,
            models.device,
            image,
            boxes_for_ocr,
            self.settings,
            inference_mode=inference_mode,
        )
        timings["recognition"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        indent_levels = compute_indent_levels(boxes_for_ocr, self.settings)
        recognized_text = format_text(texts, indent_levels, self.settings)
        records = build_box_records(boxes, classifications, texts, indent_levels)
        timings["postprocess"] = round(time.perf_counter() - stage_started, 4)

        visualization_path = None
        if self.settings.save_visualizations:
            stage_started = time.perf_counter()
            visualization_bytes = draw_visualization(image, boxes, classifications)
            saved_path = write_output("viz", ".png", visualization_bytes, self.settings)
            visualization_path = saved_path.url
            timings["save_result"] = round(time.perf_counter() - stage_started, 4)
        else:
            timings["save_result"] = 0.0

        return {
            "success": True,
            "filename": original_filename,
            "recognized_text": recognized_text,
            "boxes": records,
            "processing_time": round(time.perf_counter() - started, 4),
            "stage_timings": timings,
            "visualization_path": visualization_path,
            "request_id": request_id,
            "error": None,
        }
