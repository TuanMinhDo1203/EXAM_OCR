from PIL import Image

from app.core.config import Settings


def detect_boxes(yolo, image: Image.Image, settings: Settings) -> list[list[float]]:
    results = yolo(image, conf=settings.yolo_conf, iou=settings.yolo_iou)
    if not results:
        return []
    boxes = results[0].boxes
    if boxes is None or boxes.xyxy is None:
        return []

    xyxy = boxes.xyxy.cpu().numpy().tolist()
    conf = boxes.conf.cpu().numpy().tolist() if boxes.conf is not None else [1.0] * len(xyxy)
    picked = [box for box, score in zip(xyxy, conf) if score >= settings.yolo_min_conf]
    picked.sort(key=lambda item: (item[1], item[0]))
    return picked
