import numpy as np
import torch
from PIL import Image, ImageOps
from sklearn.cluster import DBSCAN

from app.core.config import Settings


def pad_crop(crop: Image.Image, settings: Settings, fill_color: tuple[int, int, int] = (255, 255, 255)) -> Image.Image:
    if settings.pad_x == 0 and settings.pad_y == 0:
        return crop
    return ImageOps.expand(
        crop,
        border=(settings.pad_x, settings.pad_y, settings.pad_x, settings.pad_y),
        fill=fill_color,
    )


def ocr_crops(processor, trocr, device: str, image: Image.Image, boxes: list[list[float]], settings: Settings) -> list[str]:
    texts: list[str] = []
    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = pad_crop(image.crop((x1, y1, x2, y2)), settings=settings)
        pixel_values = processor(images=crop, return_tensors="pt").pixel_values.to(device)
        with torch.no_grad():
            generated_ids = trocr.generate(
                pixel_values,
                num_beams=settings.trocr_num_beams,
                max_new_tokens=settings.trocr_max_tokens,
                early_stopping=True,
            )
        texts.append(processor.batch_decode(generated_ids, skip_special_tokens=True)[0])
    return texts


def compute_indent_levels(boxes: list[list[float]], settings: Settings) -> list[int]:
    if not boxes:
        return []

    x1_coords = np.array([[box[0]] for box in boxes])
    clustering = DBSCAN(eps=settings.indent_cluster_eps, min_samples=1).fit(x1_coords)
    labels = clustering.labels_

    unique_labels = sorted(set(labels))
    label_to_x = {
        label: np.mean([boxes[index][0] for index in range(len(boxes)) if labels[index] == label])
        for label in unique_labels
    }
    sorted_labels = sorted(unique_labels, key=lambda label: label_to_x[label])
    label_to_indent = {label: idx for idx, label in enumerate(sorted_labels)}
    return [label_to_indent[label] for label in labels]
