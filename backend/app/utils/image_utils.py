from io import BytesIO

from PIL import Image


def load_image_from_bytes(content: bytes) -> Image.Image:
    return Image.open(BytesIO(content)).convert("RGB")
