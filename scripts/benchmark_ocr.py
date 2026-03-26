import argparse
import statistics
import time
import uuid
from pathlib import Path
import sys

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

try:
    import torch
except Exception:  # pragma: no cover
    torch = None

try:
    from optimum.intel import OVModelForVision2Seq
except Exception:  # pragma: no cover
    OVModelForVision2Seq = None

try:
    from optimum.onnxruntime import ORTModelForVision2Seq
except Exception:  # pragma: no cover
    ORTModelForVision2Seq = None

try:
    import onnxruntime as ort
except Exception:  # pragma: no cover
    ort = None

from app.core.config import get_settings
from app.core.model_registry import ModelRegistry
from app.services.ocr_pipeline import OCRPipelineService
from app.services.classification import classify_crops
from app.services.detection import detect_boxes
from app.services.formatting import build_box_records, format_text
from app.services.recognition import compute_indent_levels, pad_crop
from app.utils.image_utils import downscale_image
from transformers import TrOCRProcessor


def run_once(service, image_path: Path) -> dict:
    image = Image.open(image_path).convert("RGB")
    try:
        return service.predict(image=image, original_filename=image_path.name, request_id=uuid.uuid4().hex)
    finally:
        image.close()


def benchmark(service, image_paths: list[Path]) -> dict:
    runs = []
    for image_path in image_paths:
        started = time.perf_counter()
        result = run_once(service, image_path)
        runs.append(
            {
                "image": image_path.name,
                "wall_time": round(time.perf_counter() - started, 4),
                "pipeline_time": result["processing_time"],
                "stage_timings": result["stage_timings"],
            }
        )

    return {
        "count": len(runs),
        "avg_wall_time": round(statistics.mean(item["wall_time"] for item in runs), 4),
        "avg_pipeline_time": round(statistics.mean(item["pipeline_time"] for item in runs), 4),
        "runs": runs,
    }


def build_sample_set(image_paths: list[Path], target_count: int) -> list[Path]:
    if not image_paths:
        return []
    if len(image_paths) >= target_count:
        return image_paths[:target_count]
    repeated = []
    while len(repeated) < target_count:
        repeated.extend(image_paths)
    return repeated[:target_count]


def resolve_benchmark_device(requested_device: str) -> str:
    if requested_device == "cpu":
        return "cpu"
    if requested_device == "cuda":
        if torch is not None and torch.cuda.is_available():
            return "cuda"
        print("Requested device=cuda but CUDA is unavailable. Falling back to cpu.")
        return "cpu"
    if torch is not None and torch.cuda.is_available():
        return "cuda"
    return "cpu"


def print_runtime_info(requested_device: str, resolved_device: str) -> None:
    cuda_available = bool(torch is not None and torch.cuda.is_available())
    device_count = torch.cuda.device_count() if cuda_available else 0
    device_name = torch.cuda.get_device_name(0) if cuda_available and device_count > 0 else "-"

    print("=== Runtime Info ===")
    print(f"Requested device: {requested_device}")
    print(f"Resolved device: {resolved_device}")
    print(f"CUDA available: {cuda_available}")
    print(f"CUDA device count: {device_count}")
    print(f"CUDA device name: {device_name}")


def print_quantization_info(enabled: bool, quantize_trocr: bool, quantize_resnet: bool) -> None:
    print("=== Quantization Info ===")
    print(f"Dynamic quantization enabled: {enabled}")
    print(f"Quantize TrOCR: {quantize_trocr}")
    print(f"Quantize ResNet: {quantize_resnet}")


def print_fp16_info(enabled: bool, resolved_device: str) -> None:
    print("=== FP16 Info ===")
    print(f"TrOCR fp16 enabled: {enabled}")
    print(f"FP16 active: {enabled and resolved_device == 'cuda'}")


def load_openvino_recognizer(ov_dir: Path):
    if OVModelForVision2Seq is None:
        raise RuntimeError("optimum-intel is not installed in this environment.")
    processor = TrOCRProcessor.from_pretrained(ov_dir, use_fast=True)
    model = OVModelForVision2Seq.from_pretrained(ov_dir, device="CPU")
    return processor, model


def load_onnx_recognizer(onnx_dir: Path, requested_device: str):
    if ORTModelForVision2Seq is None:
        raise RuntimeError("optimum[onnxruntime] is not installed in this environment.")
    if ort is None:
        raise RuntimeError("onnxruntime is not installed in this environment.")

    provider = "CPUExecutionProvider"
    providers = ["CPUExecutionProvider"]
    if requested_device == "cuda":
        available = ort.get_available_providers()
        if "CUDAExecutionProvider" not in available:
            raise RuntimeError(
                "CUDAExecutionProvider is unavailable in this environment. "
                f"Available providers: {available}"
            )
        provider = "CUDAExecutionProvider"
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

    processor = TrOCRProcessor.from_pretrained(onnx_dir, use_fast=True)
    model = ORTModelForVision2Seq.from_pretrained(
        onnx_dir,
        provider=provider,
        providers=providers,
        use_cache=False,
        use_merged=False,
        encoder_file_name="encoder_model.onnx",
        decoder_file_name="decoder_model.onnx",
        use_io_binding=False,
    )

    return processor, model


def ocr_crops_openvino(processor, model, image: Image.Image, boxes: list[list[float]], settings) -> list[str]:
    texts: list[str] = []
    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = pad_crop(image.crop((x1, y1, x2, y2)), settings=settings)
        inputs = processor(images=crop, return_tensors="pt")
        generated_ids = model.generate(
            **inputs,
            num_beams=settings.trocr_num_beams,
            max_new_tokens=settings.trocr_max_tokens,
        )
        texts.append(processor.batch_decode(generated_ids, skip_special_tokens=True)[0])
    return texts


def ocr_crops_onnx(processor, model, image: Image.Image, boxes: list[list[float]], settings) -> list[str]:
    texts: list[str] = []
    for box in boxes:
        x1, y1, x2, y2 = [int(max(0, value)) for value in box]
        crop = pad_crop(image.crop((x1, y1, x2, y2)), settings=settings)
        inputs = processor(images=crop, return_tensors="pt")
        generated_ids = model.generate(
            **inputs,
            num_beams=settings.trocr_num_beams,
            max_new_tokens=settings.trocr_max_tokens,
        )
        texts.append(processor.batch_decode(generated_ids, skip_special_tokens=True)[0])
    return texts


def run_openvino_once(image_path: Path, registry: ModelRegistry, settings, ov_processor, ov_model) -> dict:
    image = Image.open(image_path).convert("RGB")
    try:
        timings: dict[str, float] = {}
        started = time.perf_counter()
        models = registry.get_models()

        stage_started = time.perf_counter()
        image = downscale_image(image, settings.max_image_dim)
        timings["preprocess"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes = detect_boxes(models.yolo, image, settings)
        timings["detection"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        classifications = classify_crops(
            models.resnet,
            models.resnet_transform,
            models.device,
            image,
            boxes,
        )
        timings["classification"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes_for_ocr = [box for box, cls in zip(boxes, classifications) if cls["class"] != "crossed"]
        texts = ocr_crops_openvino(ov_processor, ov_model, image, boxes_for_ocr, settings)
        timings["recognition"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        indent_levels = compute_indent_levels(boxes_for_ocr, settings)
        recognized_text = format_text(texts, indent_levels, settings)
        build_box_records(boxes, classifications, texts, indent_levels)
        timings["postprocess"] = round(time.perf_counter() - stage_started, 4)

        return {
            "image": image_path.name,
            "wall_time": round(time.perf_counter() - started, 4),
            "pipeline_time": round(time.perf_counter() - started, 4),
            "stage_timings": timings,
            "recognized_text": recognized_text,
        }
    finally:
        image.close()


def benchmark_openvino(image_paths: list[Path], registry: ModelRegistry, settings, ov_dir: Path) -> dict:
    ov_processor, ov_model = load_openvino_recognizer(ov_dir)
    runs = [run_openvino_once(image_path, registry, settings, ov_processor, ov_model) for image_path in image_paths]
    return {
        "count": len(runs),
        "avg_wall_time": round(statistics.mean(item["wall_time"] for item in runs), 4),
        "avg_pipeline_time": round(statistics.mean(item["pipeline_time"] for item in runs), 4),
        "runs": runs,
    }


def run_onnx_once(image_path: Path, registry: ModelRegistry, settings, onnx_processor, onnx_model) -> dict:
    image = Image.open(image_path).convert("RGB")
    try:
        timings: dict[str, float] = {}
        started = time.perf_counter()
        models = registry.get_models()

        stage_started = time.perf_counter()
        image = downscale_image(image, settings.max_image_dim)
        timings["preprocess"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes = detect_boxes(models.yolo, image, settings)
        timings["detection"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        classifications = classify_crops(
            models.resnet,
            models.resnet_transform,
            models.device,
            image,
            boxes,
        )
        timings["classification"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        boxes_for_ocr = [box for box, cls in zip(boxes, classifications) if cls["class"] != "crossed"]
        texts = ocr_crops_onnx(onnx_processor, onnx_model, image, boxes_for_ocr, settings)
        timings["recognition"] = round(time.perf_counter() - stage_started, 4)

        stage_started = time.perf_counter()
        indent_levels = compute_indent_levels(boxes_for_ocr, settings)
        recognized_text = format_text(texts, indent_levels, settings)
        build_box_records(boxes, classifications, texts, indent_levels)
        timings["postprocess"] = round(time.perf_counter() - stage_started, 4)

        return {
            "image": image_path.name,
            "wall_time": round(time.perf_counter() - started, 4),
            "pipeline_time": round(time.perf_counter() - started, 4),
            "stage_timings": timings,
            "recognized_text": recognized_text,
        }
    finally:
        image.close()


def benchmark_onnx(image_paths: list[Path], registry: ModelRegistry, settings, onnx_dir: Path) -> dict:
    onnx_processor, onnx_model = load_onnx_recognizer(onnx_dir, settings.device)
    runs = [run_onnx_once(image_path, registry, settings, onnx_processor, onnx_model) for image_path in image_paths]
    return {
        "count": len(runs),
        "avg_wall_time": round(statistics.mean(item["wall_time"] for item in runs), 4),
        "avg_pipeline_time": round(statistics.mean(item["pipeline_time"] for item in runs), 4),
        "runs": runs,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", nargs="+", required=True, help="One or more image paths")
    parser.add_argument(
        "--mode",
        choices=["optimized", "openvino", "onnx", "both", "all"],
        default="optimized",
        help="Which pipeline version to benchmark",
    )
    parser.add_argument(
        "--device",
        choices=["auto", "cpu", "cuda"],
        default="auto",
        help="Benchmark on auto/cpu/cuda. If cuda is unavailable, the script falls back to cpu.",
    )
    parser.add_argument(
        "--counts",
        nargs="+",
        type=int,
        default=[1, 5],
        help="Image counts to benchmark. Example: --counts 1 or --counts 1 5 10",
    )
    parser.add_argument(
        "--dynamic-quantization",
        action="store_true",
        help="Enable dynamic quantization. Effective only on CPU.",
    )
    parser.add_argument(
        "--trocr-fp16",
        action="store_true",
        help="Enable fp16 for TrOCR on CUDA. Ignored on CPU.",
    )
    parser.add_argument(
        "--quantize-trocr",
        action="store_true",
        help="Quantize TrOCR when dynamic quantization is enabled.",
    )
    parser.add_argument(
        "--quantize-resnet",
        action="store_true",
        help="Quantize ResNet when dynamic quantization is enabled.",
    )
    parser.add_argument(
        "--openvino-dir",
        type=str,
        default=str(PROJECT_ROOT / "backend" / "models" / "trocr_openvino"),
        help="Path to exported OpenVINO TrOCR directory.",
    )
    parser.add_argument(
        "--onnx-dir",
        type=str,
        default=str(PROJECT_ROOT / "backend" / "models" / "trocr_onnx"),
        help="Path to exported ONNX TrOCR directory.",
    )
    args = parser.parse_args()

    settings = get_settings()
    settings.device = resolve_benchmark_device(args.device)
    settings.enable_trocr_fp16 = args.trocr_fp16 and settings.device == "cuda"
    if args.dynamic_quantization:
        settings.enable_dynamic_quantization = True
        if args.quantize_trocr or args.quantize_resnet:
            settings.quantize_trocr = args.quantize_trocr
            settings.quantize_resnet = args.quantize_resnet
    print_runtime_info(args.device, settings.device)
    print_quantization_info(
        settings.enable_dynamic_quantization,
        settings.quantize_trocr,
        settings.quantize_resnet,
    )
    print_fp16_info(settings.enable_trocr_fp16, settings.device)

    registry = ModelRegistry(settings)
    registry.load()
    services: list[tuple[str, object]] = []
    if args.mode in {"optimized", "both", "all"}:
        services.append(("optimized", OCRPipelineService(registry, settings)))

    image_paths = [Path(item) for item in args.images]
    missing_paths = [str(path) for path in image_paths if not path.exists()]
    if missing_paths:
        raise FileNotFoundError(f"Missing image paths: {', '.join(missing_paths)}")

    for name, service in services:
        for count in args.counts:
            sample = build_sample_set(image_paths, count)
            report = benchmark(service, sample)
            print(f"\n=== Benchmark [{name}]: {count} image(s) ===")
            print(f"Average wall time: {report['avg_wall_time']}s")
            print(f"Average pipeline time: {report['avg_pipeline_time']}s")
            for run in report["runs"]:
                print(
                    f"- {run['image']}: wall={run['wall_time']}s "
                    f"pipeline={run['pipeline_time']}s timings={run['stage_timings']}"
                )

    if args.mode in {"openvino", "all"}:
        ov_dir = Path(args.openvino_dir)
        if not ov_dir.exists():
            raise FileNotFoundError(f"OpenVINO model directory not found: {ov_dir}")
        for count in args.counts:
            sample = build_sample_set(image_paths, count)
            report = benchmark_openvino(sample, registry, settings, ov_dir)
            print(f"\n=== Benchmark [openvino]: {count} image(s) ===")
            print(f"Average wall time: {report['avg_wall_time']}s")
            print(f"Average pipeline time: {report['avg_pipeline_time']}s")
            for run in report["runs"]:
                print(
                    f"- {run['image']}: wall={run['wall_time']}s "
                    f"pipeline={run['pipeline_time']}s timings={run['stage_timings']}"
                )

    if args.mode in {"onnx", "all"}:
        onnx_dir = Path(args.onnx_dir)
        if not onnx_dir.exists():
            raise FileNotFoundError(f"ONNX model directory not found: {onnx_dir}")
        for count in args.counts:
            sample = build_sample_set(image_paths, count)
            report = benchmark_onnx(sample, registry, settings, onnx_dir)
            print(f"\n=== Benchmark [onnx]: {count} image(s) ===")
            print(f"Average wall time: {report['avg_wall_time']}s")
            print(f"Average pipeline time: {report['avg_pipeline_time']}s")
            for run in report["runs"]:
                print(
                    f"- {run['image']}: wall={run['wall_time']}s "
                    f"pipeline={run['pipeline_time']}s timings={run['stage_timings']}"
                )


if __name__ == "__main__":
    main()
