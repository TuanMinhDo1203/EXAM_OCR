from dataclasses import dataclass
from typing import Any

from app.core.config import Settings
from app.core.logger import get_logger

try:
    import torch
    import openvino as ov
    from optimum.intel import OVModelForVision2Seq
    from torchvision import transforms
    from transformers import TrOCRProcessor
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    torch = None
    ov = None
    OVModelForVision2Seq = None
    transforms = None
    TrOCRProcessor = None
    YOLO = None


@dataclass
class LoadedModels:
    yolo: Any
    processor: Any
    trocr: Any
    resnet: Any
    resnet_transform: Any
    device: str


class ModelRegistry:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._models: LoadedModels | None = None
        self._load_error: str | None = None
        self.logger = get_logger("backend.model_registry")

    @property
    def load_error(self) -> str | None:
        return self._load_error

    @property
    def is_ready(self) -> bool:
        return self._models is not None

    def get_models(self) -> LoadedModels:
        if self._models is None:
            raise RuntimeError(self._load_error or "Models are not loaded")
        return self._models

    def load(self) -> LoadedModels:
        if self._models is not None:
            return self._models

        missing = [
            name
            for name, value in {
                "torch": torch,
                "openvino": ov,
                "optimum.intel.OVModelForVision2Seq": OVModelForVision2Seq,
                "torchvision.transforms": transforms,
                "transformers.TrOCRProcessor": TrOCRProcessor,
                "ultralytics.YOLO": YOLO,
            }.items()
            if value is None
        ]
        if missing:
            self._load_error = f"Missing ML dependencies: {', '.join(missing)}"
            raise RuntimeError(self._load_error)

        device = "cpu"
        self.logger.info("Loading local OCR models on device=%s", device)

        yolo = YOLO(str(self.settings.resolve_path(self.settings.yolo_model_path)))

        processor = TrOCRProcessor.from_pretrained(
            str(self.settings.resolve_path(self.settings.trocr_openvino_dir)),
            use_fast=True
        )
        trocr = OVModelForVision2Seq.from_pretrained(
            str(self.settings.resolve_path(self.settings.trocr_openvino_dir)),
            device="CPU",
        )

        core = ov.Core()
        resnet_model = core.read_model(str(self.settings.resolve_path(self.settings.resnet_openvino_model_path)))
        resnet = core.compile_model(resnet_model, "CPU")

        resnet_transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

        self._models = LoadedModels(
            yolo=yolo,
            processor=processor,
            trocr=trocr,
            resnet=resnet,
            resnet_transform=resnet_transform,
            device=device,
        )
        self._load_error = None
        self.logger.info("Models loaded successfully")
        return self._models
