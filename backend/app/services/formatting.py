from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

from app.core.config import Settings

CLASS_COLORS = {
    "clean": "#00ff7f",
    "ambiguous": "#ffff00",
    "crossed": "#ff0000",
}


def format_text(texts: list[str], indent_levels: list[int], settings: Settings) -> str:
    if not texts or not indent_levels:
        return ""

    lines: list[str] = []
    for text, indent_level in zip(texts, indent_levels):
        indent = " " * (settings.indent_spaces * indent_level)
        lines.append(f"{indent}{text}")
    return "\n".join(lines)


def build_box_records(
    boxes: list[list[float]],
    classifications: list[dict],
    texts: list[str],
    indent_levels: list[int],
) -> list[dict]:
    records: list[dict] = []
    text_index = 0
    for box, classification in zip(boxes, classifications):
        record = {
            "box": [int(value) for value in box],
            "class_name": classification["class"],
            "confidence": float(classification["confidence"]),
            "indent_level": None,
            "text": None,
        }
        if classification["class"] != "crossed" and text_index < len(texts):
            record["indent_level"] = indent_levels[text_index]
            record["text"] = texts[text_index]
            text_index += 1
        records.append(record)
    return records


def draw_visualization(image: Image.Image, boxes: list[list[float]], classifications: list[dict]) -> bytes:
    canvas = image.copy()
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        font = None

    for box, classification in zip(boxes, classifications):
        x1, y1, x2, y2 = [int(value) for value in box]
        class_name = classification["class"]
        confidence = classification["confidence"]
        color = CLASS_COLORS.get(class_name, "#ffffff")
        draw.rectangle((x1, y1, x2, y2), outline=color, width=3)
        label = f"{class_name} {confidence:.0%}"
        bbox = draw.textbbox((x1, max(0, y1 - 20)), label, font=font)
        draw.rectangle(bbox, fill=color)
        draw.text((x1, max(0, y1 - 20)), label, fill="#000000", font=font)

    buffer = BytesIO()
    canvas.save(buffer, format="PNG")
    return buffer.getvalue()
