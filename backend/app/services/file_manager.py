import imghdr
import uuid
from pathlib import Path

from app.core.config import Settings


class FileValidationError(ValueError):
    pass


def validate_upload(filename: str, content: bytes, settings: Settings) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in settings.allowed_extensions:
        raise FileValidationError(f"Unsupported file type: {suffix}")
    if len(content) > settings.max_upload_bytes:
        raise FileValidationError(
            f"File too large: {len(content)} bytes exceeds {settings.max_upload_bytes} bytes"
        )
    image_type = imghdr.what(None, h=content)
    if image_type not in {"jpeg", "png"}:
        raise FileValidationError("Uploaded file is not a valid JPEG or PNG image")


def write_upload(filename: str, content: bytes, settings: Settings) -> Path:
    safe_name = f"{uuid.uuid4().hex}{Path(filename).suffix.lower()}"
    destination = settings.upload_dir / safe_name
    destination.write_bytes(content)
    return destination


def write_output(prefix: str, suffix: str, content: bytes, settings: Settings) -> Path:
    destination = settings.output_dir / f"{prefix}_{uuid.uuid4().hex}{suffix}"
    destination.write_bytes(content)
    return destination
