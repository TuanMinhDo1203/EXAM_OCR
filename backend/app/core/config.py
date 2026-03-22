from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "exam-ocr-backend"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000
    streamlit_port: int = 8501
    auto_create_db_schema: bool = False

    device: Literal["auto", "cpu", "cuda"] = "auto"
    max_upload_mb: int = 10
    allowed_extensions: tuple[str, ...] = (".png", ".jpg", ".jpeg")

    yolo_model_path: str = "backend/models/YOLO/best_phase2_143.pt"
    resnet_model_path: str = "backend/models/Resnet/resnet18_text_cls.pth"
    trocr_model_path: str = "backend/models/trocr_handwritten_decoder_only_best_S1"

    yolo_conf: float = 0.6
    yolo_iou: float = 0.5
    yolo_min_conf: float = 0.25
    trocr_max_tokens: int = 128
    trocr_num_beams: int = 5
    classification_batch_size: int = 16
    trocr_batch_size: int = 8
    pad_x: int = 10
    pad_y: int = 6
    indent_cluster_eps: int = 15
    indent_spaces: int = 4
    max_image_dim: int = 1600
    save_uploads: bool = False
    save_visualizations: bool = True

    enable_grading: bool = False
    internal_grading_only: bool = True
    grading_api_key: str | None = None
    grading_timeout_seconds: int = 5

    db_server: str = "examocrserver.database.windows.net"
    db_port: int = 1433
    db_name: str = "examocrdb"
    db_user: str = "sqladmin"
    db_password: str = "ChangeMe123!"

    base_dir: Path = Field(default_factory=lambda: PROJECT_ROOT)
    storage_dir: Path = Field(default_factory=lambda: PROJECT_ROOT / "backend" / "runtime")
    upload_dir_name: str = "uploads"
    output_dir_name: str = "outputs"

    @property
    def upload_dir(self) -> Path:
        return self.storage_dir / self.upload_dir_name

    @property
    def output_dir(self) -> Path:
        return self.storage_dir / self.output_dir_name

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    def resolve_path(self, value: str) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path
        return (self.base_dir / path).resolve()


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    return settings
