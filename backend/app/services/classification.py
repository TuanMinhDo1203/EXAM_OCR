import numpy as np
import torch
from PIL import Image

CLASS_MAPPING = {0: "ambiguous", 1: "clean", 2: "crossed"}


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values, axis=1, keepdims=True)
    exp_values = np.exp(shifted)
    return exp_values / np.sum(exp_values, axis=1, keepdims=True)


def classify_crops(
    resnet,
    resnet_transform,
    device: str,
    image: Image.Image,
    boxes: list[list[float]],
) -> list[dict]:
    if not boxes:
        return []

    classifications: list[dict] = []
    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = image.crop((x1, y1, x2, y2))
        img_tensor = resnet_transform(crop).unsqueeze(0)

        if hasattr(resnet, "output"):
            outputs = resnet([img_tensor.numpy().astype(np.float32)])[resnet.output(0)]
            pred_idx = int(outputs.argmax(axis=1)[0])
            confidence = float(_softmax(outputs)[0][pred_idx])
        else:
            img_tensor = img_tensor.to(device)
            with torch.no_grad():
                outputs = resnet(img_tensor)
                pred_idx = outputs.argmax(1).item()
                confidence = torch.softmax(outputs, dim=1)[0][pred_idx].item()

        class_name = CLASS_MAPPING[pred_idx]

        classifications.append({"class": class_name, "confidence": confidence})
    return classifications
