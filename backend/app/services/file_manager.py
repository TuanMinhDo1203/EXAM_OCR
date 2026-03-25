from __future__ import annotations

import imghdr
import uuid
from dataclasses import dataclass
from pathlib import Path

import httpx

from app.core.config import Settings

try:
    from azure.storage.blob import ContainerClient
except Exception:  # pragma: no cover
    ContainerClient = None


class FileValidationError(ValueError):
    pass


@dataclass
class StoredAsset:
    name: str
    url: str
    local_path: Path | None = None


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


def _upload_to_blob(blob_name: str, content: bytes, settings: Settings) -> str:
    if ContainerClient is None:
        raise RuntimeError("azure-storage-blob is not installed")
    if not settings.azure_blob_container_url:
        raise RuntimeError("Azure Blob container URL is not configured")

    container = ContainerClient.from_container_url(settings.azure_blob_container_url)
    blob = container.get_blob_client(blob_name)
    blob.upload_blob(content, overwrite=True)
    return blob.url


def write_upload(filename: str, content: bytes, settings: Settings) -> StoredAsset:
    safe_name = f"{uuid.uuid4().hex}{Path(filename).suffix.lower()}"
    if settings.use_azure_blob_storage:
        blob_name = f"{settings.azure_blob_upload_prefix}/{safe_name}"
        return StoredAsset(name=safe_name, url=_upload_to_blob(blob_name, content, settings))

    destination = settings.upload_dir / safe_name
    destination.write_bytes(content)
    return StoredAsset(name=safe_name, url=f"/static/uploads/{safe_name}", local_path=destination)


def write_output(prefix: str, suffix: str, content: bytes, settings: Settings) -> StoredAsset:
    safe_name = f"{prefix}_{uuid.uuid4().hex}{suffix}"
    if settings.use_azure_blob_storage:
        blob_name = f"{settings.azure_blob_output_prefix}/{safe_name}"
        return StoredAsset(name=safe_name, url=_upload_to_blob(blob_name, content, settings))

    destination = settings.output_dir / safe_name
    destination.write_bytes(content)
    return StoredAsset(name=safe_name, url=f"/static/outputs/{safe_name}", local_path=destination)


def read_asset_bytes(asset_url: str, settings: Settings) -> bytes:
    if asset_url.startswith("http://") or asset_url.startswith("https://"):
        response = httpx.get(asset_url, timeout=60)
        response.raise_for_status()
        return response.content

    if asset_url.startswith("/static/uploads/"):
        return (settings.upload_dir / Path(asset_url).name).read_bytes()

    if asset_url.startswith("/static/outputs/"):
        return (settings.output_dir / Path(asset_url).name).read_bytes()

    return Path(asset_url).read_bytes()
