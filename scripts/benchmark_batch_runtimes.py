import argparse
import os
import statistics
import time
from pathlib import Path

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]

try:
    import torch
    import torch.nn as nn
    import onnxruntime as ort
    import openvino as ov
    from torchvision import models, transforms
    from ultralytics import YOLO
except Exception as exc:  # pragma: no cover
    raise RuntimeError(f"Missing runtime dependencies: {exc}") from exc


def size_mb(path: Path) -> float:
    if path.is_file():
        return path.stat().st_size / (1024 * 1024)
    total = 0
    for root, _, files in os.walk(path):
        for file in files:
            total += (Path(root) / file).stat().st_size
    return total / (1024 * 1024)


def chunked(items: list, batch_size: int) -> list[list]:
    return [items[index : index + batch_size] for index in range(0, len(items), batch_size)]


def repeat_to_length(items: list[Path], total_items: int) -> list[Path]:
    if not items:
        return []
    repeated = []
    while len(repeated) < total_items:
        repeated.extend(items)
    return repeated[:total_items]


def build_resnet(checkpoint_path: Path):
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    state_dict = checkpoint["model"] if "model" in checkpoint else checkpoint

    model = models.resnet18(weights=None)
    if "fc.1.weight" in state_dict:
        num_classes = state_dict["fc.1.weight"].shape[0]
        model.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(model.fc.in_features, num_classes),
        )
    else:
        num_classes = state_dict["fc.weight"].shape[0]
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    model.load_state_dict(state_dict)
    model.eval()
    return model


def load_resnet_batch(image_paths: list[Path]) -> np.ndarray:
    transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    tensors = [transform(Image.open(path).convert("RGB")) for path in image_paths]
    return torch.stack(tensors).numpy().astype(np.float32)


def measure_workload(run_fn, runs: int, total_images: int) -> dict:
    totals = []
    for _ in range(runs):
        start = time.perf_counter()
        run_fn()
        totals.append(time.perf_counter() - start)

    total_avg = statistics.mean(totals)
    return {
        "total_avg": total_avg,
        "total_min": min(totals),
        "total_max": max(totals),
        "avg_per_image": total_avg / total_images,
        "images_per_sec": total_images / total_avg if total_avg > 0 else 0.0,
    }


def benchmark_resnet_workload(image_paths: list[Path], batch_size: int, runs: int) -> list[dict]:
    pth_path = PROJECT_ROOT / "backend" / "models" / "Resnet" / "resnet18_text_cls.pth"
    onnx_path = PROJECT_ROOT / "backend" / "models" / "Resnet" / "resnet18_text_cls.onnx"
    openvino_dir = PROJECT_ROOT / "backend" / "models" / "resnet_openvino"
    openvino_xml = openvino_dir / "resnet18_text_cls.xml"

    batches = [load_resnet_batch(batch) for batch in chunked(image_paths, batch_size)]
    total_images = len(image_paths)
    results = []

    model_pt = build_resnet(pth_path)

    def run_pt():
        with torch.no_grad():
            for batch_inputs in batches:
                model_pt(torch.from_numpy(batch_inputs))

    run_pt()
    result = measure_workload(run_pt, runs=runs, total_images=total_images)
    result.update({"runtime": "pytorch", "size_mb": size_mb(pth_path)})
    results.append(result)

    if onnx_path.exists():
        session_onnx = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])

        def run_onnx():
            for batch_inputs in batches:
                session_onnx.run(None, {"input": batch_inputs})

        run_onnx()
        result = measure_workload(run_onnx, runs=runs, total_images=total_images)
        result.update({"runtime": "onnx", "size_mb": size_mb(onnx_path)})
        results.append(result)

    if openvino_xml.exists():
        core = ov.Core()
        model_ov = core.read_model(model=str(openvino_xml))
        compiled_ov = core.compile_model(model_ov, "CPU")
        output_layer = compiled_ov.output(0)

        def run_openvino():
            for batch_inputs in batches:
                compiled_ov([batch_inputs])[output_layer]

        run_openvino()
        result = measure_workload(run_openvino, runs=runs, total_images=total_images)
        result.update({"runtime": "openvino", "size_mb": size_mb(openvino_dir)})
        results.append(result)

    return results


def benchmark_yolo_workload(image_paths: list[Path], batch_size: int, runs: int) -> list[dict]:
    pth_path = PROJECT_ROOT / "backend" / "models" / "YOLO" / "best_phase2_143.pt"
    onnx_path = PROJECT_ROOT / "backend" / "models" / "YOLO" / "best_phase2_143.onnx"
    openvino_dir = PROJECT_ROOT / "backend" / "models" / "YOLO" / "best_phase2_143_openvino_model"

    batches = [[str(path) for path in batch] for batch in chunked(image_paths, batch_size)]
    total_images = len(image_paths)
    results = []

    model_pt = YOLO(str(pth_path), task="detect")

    def run_pt():
        for batch in batches:
            model_pt(batch, conf=0.6, iou=0.5, verbose=False, device="cpu")

    run_pt()
    result = measure_workload(run_pt, runs=runs, total_images=total_images)
    result.update({"runtime": "pytorch", "size_mb": size_mb(pth_path)})
    results.append(result)

    if onnx_path.exists():
        model_onnx = YOLO(str(onnx_path), task="detect")

        def run_onnx():
            for batch in batches:
                model_onnx(batch, conf=0.6, iou=0.5, verbose=False, device="cpu")

        run_onnx()
        result = measure_workload(run_onnx, runs=runs, total_images=total_images)
        result.update({"runtime": "onnx", "size_mb": size_mb(onnx_path)})
        results.append(result)

    if openvino_dir.exists():
        model_ov = YOLO(str(openvino_dir), task="detect")

        def run_openvino():
            for batch in batches:
                model_ov(batch, conf=0.6, iou=0.5, verbose=False, device="cpu")

        run_openvino()
        result = measure_workload(run_openvino, runs=runs, total_images=total_images)
        result.update({"runtime": "openvino", "size_mb": size_mb(openvino_dir)})
        results.append(result)

    return results


def print_table(title: str, total_images: int, batch_size: int, results: list[dict]) -> None:
    print(f"\n=== {title} | total_images={total_images} | batch_size={batch_size} ===")
    print(
        f"{'runtime':<12} {'total_avg':>10} {'avg/img':>10} "
        f"{'img/s':>10} {'total_min':>10} {'total_max':>10} {'size_mb':>12}"
    )
    for row in results:
        print(
            f"{row['runtime']:<12} "
            f"{row['total_avg']:>10.4f} "
            f"{row['avg_per_image']:>10.4f} "
            f"{row['images_per_sec']:>10.2f} "
            f"{row['total_min']:>10.4f} "
            f"{row['total_max']:>10.4f} "
            f"{row['size_mb']:>12.2f}"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["resnet", "yolo", "both"], default="both")
    parser.add_argument("--images", nargs="+", required=True, help="Seed image paths used to build the workload")
    parser.add_argument("--total-images", type=int, default=10, help="Total images in the fixed workload")
    parser.add_argument("--batch-sizes", nargs="+", type=int, default=[1, 2, 4])
    parser.add_argument("--runs", type=int, default=20)
    args = parser.parse_args()

    base_images = [Path(item) for item in args.images]
    missing = [str(path) for path in base_images if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing image paths: {', '.join(missing)}")

    workload_images = repeat_to_length(base_images, args.total_images)

    for batch_size in args.batch_sizes:
        if args.mode in {"resnet", "both"}:
            resnet_results = benchmark_resnet_workload(workload_images, batch_size=batch_size, runs=args.runs)
            print_table("RESNET", total_images=args.total_images, batch_size=batch_size, results=resnet_results)

        if args.mode in {"yolo", "both"}:
            yolo_results = benchmark_yolo_workload(workload_images, batch_size=batch_size, runs=args.runs)
            print_table("YOLO", total_images=args.total_images, batch_size=batch_size, results=yolo_results)


if __name__ == "__main__":
    main()
