from dataclasses import dataclass
from typing import Any

from app.core.config import Settings
from app.core.logger import get_logger

try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    torch = None
    nn = None
    models = None
    transforms = None
    TrOCRProcessor = None
    VisionEncoderDecoderModel = None
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
                "torch.nn": nn,
                "torchvision.models": models,
                "torchvision.transforms": transforms,
                "transformers.TrOCRProcessor": TrOCRProcessor,
                "transformers.VisionEncoderDecoderModel": VisionEncoderDecoderModel,
                "ultralytics.YOLO": YOLO,
            }.items()
            if value is None
        ]
        if missing:
            self._load_error = f"Missing ML dependencies: {', '.join(missing)}"
            raise RuntimeError(self._load_error)

        device = self._resolve_device()
        self.logger.info("Loading OCR models on device=%s", device)

        yolo = YOLO(str(self.settings.resolve_path(self.settings.yolo_model_path)))

        processor = TrOCRProcessor.from_pretrained(
            str(self.settings.resolve_path(self.settings.trocr_model_path))
        )
        trocr = VisionEncoderDecoderModel.from_pretrained(
            str(self.settings.resolve_path(self.settings.trocr_model_path))
        ).to(device)
        trocr.eval()

        checkpoint = torch.load(
            str(self.settings.resolve_path(self.settings.resnet_model_path)),
            map_location=device,
        )
        state_dict = checkpoint["model"] if "model" in checkpoint else checkpoint

        resnet = models.resnet18(weights=None)
        if "fc.1.weight" in state_dict:
            num_classes = state_dict["fc.1.weight"].shape[0]
            resnet.fc = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(resnet.fc.in_features, num_classes),
            )
        else:
            num_classes = state_dict["fc.weight"].shape[0]
            resnet.fc = nn.Linear(resnet.fc.in_features, num_classes)

        resnet.load_state_dict(state_dict)
        resnet = resnet.to(device)
        resnet.eval()

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

    def _resolve_device(self) -> str:
        if self.settings.device == "cpu":
            return "cpu"
        if self.settings.device == "cuda":
            return "cuda"
        if torch is not None and torch.cuda.is_available():
            return "cuda"
        return "cpu"
