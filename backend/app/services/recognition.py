from __future__ import annotations

import io

import httpx
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


def _resolve_remote_ocr_endpoint(settings: Settings) -> str:
    if not settings.remote_ocr_url:
        raise RuntimeError("Remote OCR URL is not configured")
    endpoint = settings.remote_ocr_url.rstrip("/")
    if endpoint.endswith("/predict"):
        return endpoint
    return f"{endpoint}/predict"


def _ocr_crop_remote(crop: Image.Image, settings: Settings) -> str:
    endpoint = _resolve_remote_ocr_endpoint(settings)
    payload = io.BytesIO()
    crop.save(payload, format="PNG")
    payload.seek(0)
    with httpx.Client(timeout=settings.remote_ocr_timeout_seconds) as client:
        response = client.post(
            endpoint,
            files={"file": ("crop.png", payload.getvalue(), "image/png")},
        )
        response.raise_for_status()
        data = response.json()
    return (data.get("recognized_text") or data.get("text") or "").strip()


def ocr_crops(
    processor,
    trocr,
    device: str,
    image: Image.Image,
    boxes: list[list[float]],
    settings: Settings,
    inference_mode: str = "local",
) -> list[str]:
    texts: list[str] = []
    if not boxes:
        return texts

    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = pad_crop(image.crop((x1, y1, x2, y2)), settings=settings)
        if inference_mode == "remote":
            texts.append(_ocr_crop_remote(crop, settings))
            continue

        inputs = processor(images=crop, return_tensors="pt")
        if device == "cuda":
            inputs = {key: value.to(device) for key, value in inputs.items()}
            if settings.enable_trocr_fp16:
                inputs["pixel_values"] = inputs["pixel_values"].half()
        with torch.inference_mode():
            generated_ids = trocr.generate(
                **inputs,
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
