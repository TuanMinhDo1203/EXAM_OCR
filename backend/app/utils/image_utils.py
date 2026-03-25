from io import BytesIO

from PIL import Image


def load_image_from_bytes(content: bytes) -> Image.Image:
    return Image.open(BytesIO(content)).convert("RGB")


def downscale_image(image: Image.Image, max_dim: int) -> Image.Image:
    if max_dim <= 0:
        return image

    width, height = image.size
    largest_side = max(width, height)
    if largest_side <= max_dim:
        return image

    scale = max_dim / float(largest_side)
    new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
    return image.resize(new_size, Image.Resampling.LANCZOS)
