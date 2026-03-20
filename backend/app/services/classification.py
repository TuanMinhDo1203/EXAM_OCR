import torch
from PIL import Image

CLASS_MAPPING = {0: "ambiguous", 1: "clean", 2: "crossed"}


def classify_crops(resnet, resnet_transform, device: str, image: Image.Image, boxes: list[list[float]]) -> list[dict]:
    if not boxes:
        return []

    classifications: list[dict] = []
    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = image.crop((x1, y1, x2, y2))
        img_tensor = resnet_transform(crop).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = resnet(img_tensor)
            pred_idx = outputs.argmax(1).item()
            class_name = CLASS_MAPPING[pred_idx]
            confidence = torch.softmax(outputs, dim=1)[0][pred_idx].item()

        classifications.append({"class": class_name, "confidence": confidence})
    return classifications
