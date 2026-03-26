#!/usr/bin/env python3
"""
Utility script to infer and benchmark the OpenVINO ResNet and TrOCR models.

Typical usage:

1. Single-image ResNet inference
python scripts/infer_openvino_models.py resnet-sample \
  --image /home/bendo/Desktop/Ben/DAT/Resnet/data_cls/test/clean/example.jpg

2. Evaluate ResNet OpenVINO on the test split
python scripts/infer_openvino_models.py resnet-eval \
  --split test \
  --batch-size 32 \
  --limit 200

3. Compare ResNet OpenVINO vs PyTorch
python scripts/infer_openvino_models.py resnet-compare \
  --split test \
  --batch-size 32 \
  --limit 200

4. Single-image TrOCR inference
python scripts/infer_openvino_models.py trocr-sample \
  --image /home/bendo/Desktop/Ben/DAT/ocr_exam_sheets/FINAL/images_all_PHASE2/000780.png

5. Evaluate TrOCR OpenVINO on test.jsonl
python scripts/infer_openvino_models.py trocr-eval \
  --split test \
  --batch-size 4 \
  --limit 100

6. Compare TrOCR OpenVINO vs PyTorch
python scripts/infer_openvino_models.py trocr-compare \
  --split test \
  --batch-size 4 \
  --limit 100
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from PIL import Image

try:
    import openvino as ov
    import torch
    import torch.nn as nn
    from optimum.intel import OVModelForVision2Seq
    from torchvision import models, transforms
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
except Exception as exc:  # pragma: no cover
    raise RuntimeError(
        "Missing dependencies. Activate the project env first, for example:\n"
        "source /home/bendo/.pyenv/versions/fis-ocr-310/bin/activate"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DAT_ROOT = PROJECT_ROOT.parent

DEFAULT_RESNET_OV = PROJECT_ROOT / "backend" / "models" / "resnet_openvino" / "resnet18_text_cls.xml"
DEFAULT_RESNET_PT = PROJECT_ROOT / "backend" / "models" / "Resnet" / "resnet18_text_cls.pth"
DEFAULT_TROCR_OV = PROJECT_ROOT / "backend" / "models" / "trocr_openvino"
DEFAULT_TROCR_PT = PROJECT_ROOT / "backend" / "models" / "trocr_handwritten_decoder_only_best_S1"

DEFAULT_RESNET_DATA = DAT_ROOT / "Resnet" / "data_cls"
DEFAULT_TROCR_IMAGE_DIR = DAT_ROOT / "ocr_exam_sheets" / "FINAL" / "images_all_PHASE2"
DEFAULT_TROCR_SPLIT_DIR = DAT_ROOT / "ocr_exam_sheets" / "FINAL" / "splits_phase2"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "evaluation_results_openvino"

DEFAULT_CLASS_TO_IDX = {"ambiguous": 0, "clean": 1, "crossed": 2}


def batched(items: Sequence, batch_size: int) -> Iterable[Sequence]:
    for start in range(0, len(items), batch_size):
        yield items[start : start + batch_size]


def softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values, axis=1, keepdims=True)
    exps = np.exp(shifted)
    return exps / np.sum(exps, axis=1, keepdims=True)


def cer(prediction: str, target: str) -> float:
    if not target:
        return 0.0 if not prediction else 1.0

    rows = len(target) + 1
    cols = len(prediction) + 1
    dp = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        dp[i][0] = i
    for j in range(cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            cost = 0 if target[i - 1] == prediction[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )

    return dp[-1][-1] / max(len(target), 1)


def print_json(data: dict) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def print_section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def ensure_output_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_csv(rows: list[dict], output_path: Path) -> None:
    if not rows:
        return
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved predictions to: {output_path}")


def save_json_file(data: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
    print(f"Saved summary to: {output_path}")


def flatten_dict(data: dict, prefix: str = "") -> dict[str, object]:
    flattened: dict[str, object] = {}
    for key, value in data.items():
        flat_key = f"{prefix}.{key}" if prefix else str(key)
        if isinstance(value, dict):
            flattened.update(flatten_dict(value, flat_key))
        else:
            flattened[flat_key] = value
    return flattened


def save_summary_csv(data: dict, output_path: Path) -> None:
    flattened = flatten_dict(data)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(flattened.keys()))
        writer.writeheader()
        writer.writerow(flattened)
    print(f"Saved summary to: {output_path}")


def resolve_device(requested: str) -> str:
    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available.")
    return requested


def load_image(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def render_table(headers: list[str], rows: list[list[object]]) -> str:
    string_rows = [[str(cell) for cell in row] for row in rows]
    widths = [len(str(header)) for header in headers]
    for row in string_rows:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))

    def render_row(row: list[str]) -> str:
        return "  ".join(cell.ljust(widths[index]) for index, cell in enumerate(row))

    lines = [render_row([str(header) for header in headers])]
    lines.append("  ".join("-" * width for width in widths))
    lines.extend(render_row(row) for row in string_rows)
    return "\n".join(lines)


def compute_confusion_matrix(rows: list[dict], class_names: list[str]) -> list[list[int]]:
    index_map = {name: index for index, name in enumerate(class_names)}
    matrix = [[0 for _ in class_names] for _ in class_names]
    for row in rows:
        gt = row["ground_truth"]
        pred = row["prediction"]
        if gt in index_map and pred in index_map:
            matrix[index_map[gt]][index_map[pred]] += 1
    return matrix


def compute_resnet_classification_report(rows: list[dict], class_names: list[str]) -> list[list[object]]:
    report_rows: list[list[object]] = []
    supports = []
    precisions = []
    recalls = []
    f1s = []

    for class_name in class_names:
        tp = sum(1 for row in rows if row["ground_truth"] == class_name and row["prediction"] == class_name)
        fp = sum(1 for row in rows if row["ground_truth"] != class_name and row["prediction"] == class_name)
        fn = sum(1 for row in rows if row["ground_truth"] == class_name and row["prediction"] != class_name)
        support = sum(1 for row in rows if row["ground_truth"] == class_name)

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

        supports.append(support)
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

        report_rows.append(
            [
                class_name,
                f"{precision:.4f}",
                f"{recall:.4f}",
                f"{f1:.4f}",
                support,
            ]
        )

    total_support = sum(supports)
    accuracy = statistics.mean(row["correct"] for row in rows) if rows else 0.0
    macro_precision = statistics.mean(precisions) if precisions else 0.0
    macro_recall = statistics.mean(recalls) if recalls else 0.0
    macro_f1 = statistics.mean(f1s) if f1s else 0.0
    weighted_precision = sum(p * s for p, s in zip(precisions, supports)) / total_support if total_support else 0.0
    weighted_recall = sum(r * s for r, s in zip(recalls, supports)) / total_support if total_support else 0.0
    weighted_f1 = sum(f * s for f, s in zip(f1s, supports)) / total_support if total_support else 0.0

    report_rows.append(["accuracy", "", "", f"{accuracy:.4f}", total_support])
    report_rows.append(["macro avg", f"{macro_precision:.4f}", f"{macro_recall:.4f}", f"{macro_f1:.4f}", total_support])
    report_rows.append(
        ["weighted avg", f"{weighted_precision:.4f}", f"{weighted_recall:.4f}", f"{weighted_f1:.4f}", total_support]
    )
    return report_rows


def group_trocr_rows(rows: list[dict], key: str) -> list[list[object]]:
    values = sorted({row.get(key, "") for row in rows if row.get(key, "")})
    grouped_rows: list[list[object]] = []
    for value in values:
        subset = [row for row in rows if row.get(key, "") == value]
        if not subset:
            continue
        grouped_rows.append(
            [
                value,
                len(subset),
                f"{statistics.mean(row['cer'] for row in subset):.4f}",
                f"{statistics.mean(row['exact_match'] for row in subset):.4f}",
            ]
        )
    return grouped_rows


@dataclass
class TimedResult:
    elapsed_seconds: float
    predictions: list


class ResNetOpenVINO:
    def __init__(self, model_path: Path, image_height: int, image_width: int, class_to_idx: dict[str, int] | None = None):
        self.class_to_idx = class_to_idx or DEFAULT_CLASS_TO_IDX
        self.idx_to_class = {value: key for key, value in self.class_to_idx.items()}
        self.transform = transforms.Compose(
            [
                transforms.Resize((image_height, image_width)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )
        core = ov.Core()
        self.model = core.compile_model(str(model_path), "CPU")
        self.output = self.model.output(0)

    def predict_images(self, image_paths: Sequence[Path]) -> TimedResult:
        started = time.perf_counter()
        batch = np.stack([self.transform(load_image(path)).numpy() for path in image_paths]).astype(np.float32)
        logits = self.model([batch])[self.output]
        probs = softmax(logits)
        predictions = []
        for index, path in enumerate(image_paths):
            pred_idx = int(np.argmax(logits[index]))
            predictions.append(
                {
                    "image": str(path),
                    "pred_idx": pred_idx,
                    "pred_class": self.idx_to_class.get(pred_idx, str(pred_idx)),
                    "confidence": float(probs[index][pred_idx]),
                    "probs": {self.idx_to_class[i]: float(probs[index][i]) for i in range(probs.shape[1])},
                }
            )
        return TimedResult(elapsed_seconds=time.perf_counter() - started, predictions=predictions)


class ResNetPyTorch:
    def __init__(self, checkpoint_path: Path, image_height: int, image_width: int, device: str, use_fp16: bool = False):
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        self.class_to_idx = checkpoint.get("class_to_idx", DEFAULT_CLASS_TO_IDX)
        self.idx_to_class = {value: key for key, value in self.class_to_idx.items()}
        state_dict = checkpoint["model"] if "model" in checkpoint else checkpoint

        model = models.resnet18(weights=None)
        if "fc.1.weight" in state_dict:
            model.fc = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(model.fc.in_features, state_dict["fc.1.weight"].shape[0]),
            )
        else:
            model.fc = nn.Linear(model.fc.in_features, state_dict["fc.weight"].shape[0])

        model.load_state_dict(state_dict)
        model.eval()
        self.model = model.to(device)
        self.device = device
        self.use_fp16 = bool(use_fp16 and device == "cuda")
        self.transform = transforms.Compose(
            [
                transforms.Resize((image_height, image_width)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

    def predict_images(self, image_paths: Sequence[Path]) -> TimedResult:
        if self.device == "cuda":
            torch.cuda.synchronize()
        started = time.perf_counter()
        batch = torch.stack([self.transform(load_image(path)) for path in image_paths]).to(self.device)
        with torch.inference_mode():
            if self.use_fp16:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    logits = self.model(batch)
            else:
                logits = self.model(batch)
        if self.device == "cuda":
            torch.cuda.synchronize()
        with torch.inference_mode():
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            logits_np = logits.cpu().numpy()

        predictions = []
        for index, path in enumerate(image_paths):
            pred_idx = int(np.argmax(logits_np[index]))
            predictions.append(
                {
                    "image": str(path),
                    "pred_idx": pred_idx,
                    "pred_class": self.idx_to_class.get(pred_idx, str(pred_idx)),
                    "confidence": float(probs[index][pred_idx]),
                    "probs": {self.idx_to_class[i]: float(probs[index][i]) for i in range(probs.shape[1])},
                }
            )
        return TimedResult(elapsed_seconds=time.perf_counter() - started, predictions=predictions)


class TrOCROpenVINO:
    def __init__(self, model_dir: Path, num_beams: int, max_new_tokens: int):
        self.processor = TrOCRProcessor.from_pretrained(str(model_dir), use_fast=True)
        self.model = OVModelForVision2Seq.from_pretrained(str(model_dir), device="CPU")
        self.num_beams = num_beams
        self.max_new_tokens = max_new_tokens

    def predict_images(self, image_paths: Sequence[Path]) -> TimedResult:
        started = time.perf_counter()
        images = [load_image(path) for path in image_paths]
        inputs = self.processor(images=images, return_tensors="pt")
        generated_ids = self.model.generate(
            **inputs,
            num_beams=self.num_beams,
            max_new_tokens=self.max_new_tokens,
        )
        texts = self.processor.batch_decode(generated_ids, skip_special_tokens=True)
        predictions = [{"image": str(path), "prediction": text} for path, text in zip(image_paths, texts)]
        return TimedResult(elapsed_seconds=time.perf_counter() - started, predictions=predictions)


class TrOCRPyTorch:
    def __init__(self, model_dir: Path, num_beams: int, max_new_tokens: int, device: str, use_fp16: bool = False):
        self.processor = TrOCRProcessor.from_pretrained(str(model_dir), use_fast=True)
        self.model = VisionEncoderDecoderModel.from_pretrained(str(model_dir)).to(device)
        self.model.eval()
        self.num_beams = num_beams
        self.max_new_tokens = max_new_tokens
        self.device = device
        self.use_fp16 = bool(use_fp16 and device == "cuda")

    def predict_images(self, image_paths: Sequence[Path]) -> TimedResult:
        if self.device == "cuda":
            torch.cuda.synchronize()
        started = time.perf_counter()
        images = [load_image(path) for path in image_paths]
        pixel_values = self.processor(images=images, return_tensors="pt").pixel_values.to(self.device)
        if self.use_fp16:
            pixel_values = pixel_values.half()
        with torch.inference_mode():
            if self.use_fp16:
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    generated_ids = self.model.generate(
                        pixel_values,
                        num_beams=self.num_beams,
                        max_new_tokens=self.max_new_tokens,
                    )
            else:
                generated_ids = self.model.generate(
                    pixel_values,
                    num_beams=self.num_beams,
                    max_new_tokens=self.max_new_tokens,
                )
        if self.device == "cuda":
            torch.cuda.synchronize()
        texts = self.processor.batch_decode(generated_ids, skip_special_tokens=True)
        predictions = [{"image": str(path), "prediction": text} for path, text in zip(image_paths, texts)]
        return TimedResult(elapsed_seconds=time.perf_counter() - started, predictions=predictions)


def warmup(model, sample_paths: Sequence[Path], warmup_runs: int) -> None:
    if not sample_paths:
        return
    for _ in range(max(warmup_runs, 0)):
        model.predict_images(sample_paths)


def collect_resnet_samples(dataset_dir: Path, split: str, limit: int | None = None) -> list[dict]:
    split_dir = dataset_dir / split
    if not split_dir.exists():
        raise FileNotFoundError(f"Split directory not found: {split_dir}")

    samples: list[dict] = []
    for class_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
        for image_path in sorted(class_dir.iterdir()):
            if image_path.is_file():
                samples.append({"image_path": image_path, "label": class_dir.name})

    if limit is not None:
        samples = samples[:limit]
    return samples


def collect_trocr_samples(split_dir: Path, image_dir: Path, split: str, limit: int | None = None) -> list[dict]:
    split_path = split_dir / f"{split}.jsonl"
    if not split_path.exists():
        raise FileNotFoundError(f"Split file not found: {split_path}")

    samples: list[dict] = []
    with split_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            row["image_path"] = image_dir / row["image"]
            if row["image_path"].exists():
                samples.append(row)
    if limit is not None:
        samples = samples[:limit]
    return samples


def summarize_latency(total_seconds: float, total_items: int) -> dict:
    avg_ms = (total_seconds / total_items) * 1000 if total_items else math.nan
    items_per_second = total_items / total_seconds if total_seconds > 0 else math.inf
    return {
        "total_seconds": round(total_seconds, 4),
        "total_items": total_items,
        "avg_ms_per_item": round(avg_ms, 3),
        "items_per_second": round(items_per_second, 3),
    }


def evaluate_resnet(model, samples: Sequence[dict], batch_size: int) -> tuple[dict, list[dict]]:
    rows: list[dict] = []
    total_seconds = 0.0

    for batch in batched(samples, batch_size):
        image_paths = [item["image_path"] for item in batch]
        timed = model.predict_images(image_paths)
        total_seconds += timed.elapsed_seconds

        for sample, pred in zip(batch, timed.predictions):
            rows.append(
                {
                    "image": sample["image_path"].name,
                    "ground_truth": sample["label"],
                    "prediction": pred["pred_class"],
                    "correct": int(sample["label"] == pred["pred_class"]),
                    "confidence": round(pred["confidence"], 6),
                }
            )

    accuracy = statistics.mean(row["correct"] for row in rows) if rows else 0.0
    per_class = {}
    for class_name in sorted({row["ground_truth"] for row in rows}):
        class_rows = [row for row in rows if row["ground_truth"] == class_name]
        per_class[class_name] = round(statistics.mean(row["correct"] for row in class_rows), 4)

    summary = {
        "accuracy": round(accuracy, 4),
        "per_class_accuracy": per_class,
        "class_counts": {class_name: sum(1 for row in rows if row["ground_truth"] == class_name) for class_name in sorted(per_class)},
    }
    summary.update(summarize_latency(total_seconds=total_seconds, total_items=len(rows)))
    return summary, rows


def evaluate_trocr(model, samples: Sequence[dict], batch_size: int) -> tuple[dict, list[dict]]:
    rows: list[dict] = []
    total_seconds = 0.0

    for batch in batched(samples, batch_size):
        image_paths = [item["image_path"] for item in batch]
        timed = model.predict_images(image_paths)
        total_seconds += timed.elapsed_seconds

        for sample, pred in zip(batch, timed.predictions):
            prediction = pred["prediction"]
            target = sample["text"]
            row_cer = cer(prediction, target)
            rows.append(
                {
                    "image": sample["image"],
                    "ground_truth": target,
                    "prediction": prediction,
                    "cer": round(row_cer, 6),
                    "exact_match": int(prediction.strip() == target.strip()),
                    "language": sample.get("language", ""),
                    "status": sample.get("status", ""),
                }
            )

    mean_cer = statistics.mean(row["cer"] for row in rows) if rows else 0.0
    exact_match = statistics.mean(row["exact_match"] for row in rows) if rows else 0.0
    summary = {
        "mean_cer": round(mean_cer, 4),
        "median_cer": round(statistics.median(row["cer"] for row in rows), 4) if rows else 0.0,
        "exact_match_rate": round(exact_match, 4),
        "cer_zero_rate": round(statistics.mean(int(row["cer"] == 0.0) for row in rows), 4) if rows else 0.0,
        "cer_gt50_rate": round(statistics.mean(int(row["cer"] > 0.5) for row in rows), 4) if rows else 0.0,
        "avg_gt_len": round(statistics.mean(len(row["ground_truth"]) for row in rows), 2) if rows else 0.0,
        "avg_pred_len": round(statistics.mean(len(row["prediction"]) for row in rows), 2) if rows else 0.0,
    }
    summary.update(summarize_latency(total_seconds=total_seconds, total_items=len(rows)))
    return summary, rows


def compare_summaries(openvino_summary: dict, baseline_summary: dict) -> dict:
    speedup = (
        baseline_summary["avg_ms_per_item"] / openvino_summary["avg_ms_per_item"]
        if openvino_summary["avg_ms_per_item"] > 0
        else math.inf
    )
    return {
        "openvino": openvino_summary,
        "baseline": baseline_summary,
        "speedup_vs_baseline": round(speedup, 3),
    }


def print_resnet_report(model_name: str, summary: dict, rows: list[dict]) -> None:
    class_names = sorted(summary["per_class_accuracy"])
    print_section(f"RESNET REPORT [{model_name}]")
    print(f"Samples           : {summary['total_items']}")
    print(f"Accuracy          : {summary['accuracy']:.4f}")
    print(f"Avg ms / image    : {summary['avg_ms_per_item']:.3f}")
    print(f"Images / second   : {summary['items_per_second']:.3f}")

    print("\nPer-class accuracy")
    per_class_rows = [
        [name, summary["class_counts"][name], f"{summary['per_class_accuracy'][name]:.4f}"] for name in class_names
    ]
    print(render_table(["class", "support", "accuracy"], per_class_rows))

    print("\nClassification report")
    print(render_table(["class", "precision", "recall", "f1-score", "support"], compute_resnet_classification_report(rows, class_names)))

    print("\nConfusion matrix (rows=ground truth, cols=prediction)")
    confusion_rows = []
    matrix = compute_confusion_matrix(rows, class_names)
    for class_name, values in zip(class_names, matrix):
        confusion_rows.append([class_name, *values])
    print(render_table(["gt\\pred", *class_names], confusion_rows))


def print_resnet_comparison_report(openvino_summary: dict, pytorch_summary: dict) -> None:
    comparison = compare_summaries(openvino_summary, pytorch_summary)
    print_section("RESNET COMPARISON SUMMARY")
    rows = [
        ["openvino", f"{openvino_summary['accuracy']:.4f}", f"{openvino_summary['avg_ms_per_item']:.3f}", f"{openvino_summary['items_per_second']:.3f}"],
        ["pytorch", f"{pytorch_summary['accuracy']:.4f}", f"{pytorch_summary['avg_ms_per_item']:.3f}", f"{pytorch_summary['items_per_second']:.3f}"],
    ]
    print(render_table(["runtime", "accuracy", "avg_ms/image", "images/sec"], rows))
    print(f"\nSpeedup (OpenVINO vs PyTorch): {comparison['speedup_vs_baseline']:.3f}x")


def print_trocr_report(model_name: str, split: str, summary: dict, rows: list[dict], show_worst: int) -> None:
    print_section(f"TROCR REPORT [{model_name}] [{split}]")
    print(f"Samples           : {summary['total_items']}")
    print(f"Mean CER          : {summary['mean_cer']:.4f}")
    print(f"Median CER        : {summary['median_cer']:.4f}")
    print(f"Exact Match       : {summary['exact_match_rate']:.4f}")
    print(f"CER == 0          : {summary['cer_zero_rate']:.4f}")
    print(f"CER > 0.5         : {summary['cer_gt50_rate']:.4f}")
    print(f"Avg GT length     : {summary['avg_gt_len']:.2f}")
    print(f"Avg Pred length   : {summary['avg_pred_len']:.2f}")
    print(f"Avg ms / image    : {summary['avg_ms_per_item']:.3f}")
    print(f"Images / second   : {summary['items_per_second']:.3f}")

    language_rows = group_trocr_rows(rows, "language")
    if language_rows:
        print("\nBy language")
        print(render_table(["language", "count", "mean_cer", "exact_match"], language_rows))

    status_rows = group_trocr_rows(rows, "status")
    if status_rows:
        print("\nBy status")
        print(render_table(["status", "count", "mean_cer", "exact_match"], status_rows))

    if show_worst > 0:
        print("\nWorst samples by CER")
        worst_rows = sorted(rows, key=lambda row: row["cer"], reverse=True)[:show_worst]
        preview = [[row["image"], f"{row['cer']:.4f}", row["ground_truth"], row["prediction"]] for row in worst_rows]
        print(render_table(["image", "cer", "ground_truth", "prediction"], preview))


def print_trocr_comparison_report(openvino_summary: dict, pytorch_summary: dict) -> None:
    comparison = compare_summaries(openvino_summary, pytorch_summary)
    print_section("TROCR COMPARISON SUMMARY")
    rows = [
        [
            "openvino",
            f"{openvino_summary['mean_cer']:.4f}",
            f"{openvino_summary['exact_match_rate']:.4f}",
            f"{openvino_summary['avg_ms_per_item']:.3f}",
            f"{openvino_summary['items_per_second']:.3f}",
        ],
        [
            "pytorch",
            f"{pytorch_summary['mean_cer']:.4f}",
            f"{pytorch_summary['exact_match_rate']:.4f}",
            f"{pytorch_summary['avg_ms_per_item']:.3f}",
            f"{pytorch_summary['items_per_second']:.3f}",
        ],
    ]
    print(render_table(["runtime", "mean_cer", "exact_match", "avg_ms/image", "images/sec"], rows))
    print(f"\nSpeedup (OpenVINO vs PyTorch): {comparison['speedup_vs_baseline']:.3f}x")


def auto_output_path(output_dir: Path, prefix: str, split: str) -> Path:
    return ensure_output_dir(output_dir) / f"{prefix}_{split}.csv"


def auto_summary_paths(output_dir: Path, prefix: str, split: str) -> tuple[Path, Path]:
    base_dir = ensure_output_dir(output_dir)
    return (
        base_dir / f"{prefix}_{split}.json",
        base_dir / f"{prefix}_{split}.csv",
    )


def save_summary_artifacts(output_dir: Path, prefix: str, split: str, summary: dict) -> None:
    json_path, csv_path = auto_summary_paths(output_dir, prefix, split)
    save_json_file(summary, json_path)
    save_summary_csv(summary, csv_path)


def run_resnet_sample(args: argparse.Namespace) -> None:
    image_path = Path(args.image)
    model = ResNetOpenVINO(Path(args.ov_model), args.image_height, args.image_width)
    result = model.predict_images([image_path]).predictions[0]
    print_json(result)


def run_resnet_eval(args: argparse.Namespace) -> None:
    samples = collect_resnet_samples(Path(args.dataset_dir), args.split, args.limit)
    model = ResNetOpenVINO(Path(args.ov_model), args.image_height, args.image_width)
    warmup(model, [samples[0]["image_path"]], args.warmup)
    summary, rows = evaluate_resnet(model, samples, args.batch_size)

    payload = {"model": "resnet_openvino", "split": args.split, **summary}
    print_json(payload)
    if args.full_report:
        print_resnet_report("openvino", summary, rows)
    if args.show_samples:
        print_json({"sample_predictions": rows[: args.show_samples]})
    if args.save_csv:
        save_csv(rows, Path(args.save_csv))
    if args.output_dir:
        save_summary_artifacts(Path(args.output_dir), "resnet_openvino_summary", args.split, payload)


def run_resnet_compare(args: argparse.Namespace) -> None:
    samples = collect_resnet_samples(Path(args.dataset_dir), args.split, args.limit)
    ov_model = ResNetOpenVINO(Path(args.ov_model), args.image_height, args.image_width)
    resolved_pt_device = resolve_device(args.pt_device)
    pt_model = ResNetPyTorch(
        Path(args.pt_model),
        args.image_height,
        args.image_width,
        resolved_pt_device,
        use_fp16=args.pt_fp16,
    )

    warmup(ov_model, [samples[0]["image_path"]], args.warmup)
    warmup(pt_model, [samples[0]["image_path"]], args.warmup)

    ov_summary, ov_rows = evaluate_resnet(ov_model, samples, args.batch_size)
    pt_summary, pt_rows = evaluate_resnet(pt_model, samples, args.batch_size)

    comparison_payload = compare_summaries(ov_summary, pt_summary)
    print_json(comparison_payload)
    print_resnet_comparison_report(ov_summary, pt_summary)
    if args.full_report:
        print_resnet_report("openvino", ov_summary, ov_rows)
        print_resnet_report("pytorch", pt_summary, pt_rows)
    if args.output_dir:
        output_dir = Path(args.output_dir)
        save_csv(ov_rows, auto_output_path(output_dir, "resnet_openvino_predictions", args.split))
        save_csv(pt_rows, auto_output_path(output_dir, "resnet_pytorch_predictions", args.split))
        save_summary_artifacts(output_dir, "resnet_openvino_summary", args.split, {"model": "resnet_openvino", "split": args.split, **ov_summary})
        save_summary_artifacts(
            output_dir,
            "resnet_pytorch_summary",
            args.split,
            {
                "model": "resnet_pytorch",
                "split": args.split,
                "device": resolved_pt_device,
                "fp16": bool(args.pt_fp16 and resolved_pt_device == "cuda"),
                **pt_summary,
            },
        )
        save_summary_artifacts(output_dir, "resnet_comparison_summary", args.split, comparison_payload)
    if args.show_samples:
        print_json(
            {
                "openvino_samples": ov_rows[: args.show_samples],
                "pytorch_samples": pt_rows[: args.show_samples],
            }
        )


def run_trocr_sample(args: argparse.Namespace) -> None:
    image_path = Path(args.image)
    model = TrOCROpenVINO(Path(args.ov_model_dir), args.num_beams, args.max_new_tokens)
    result = model.predict_images([image_path]).predictions[0]
    print_json(result)


def run_trocr_eval(args: argparse.Namespace) -> None:
    samples = collect_trocr_samples(Path(args.split_dir), Path(args.image_dir), args.split, args.limit)
    model = TrOCROpenVINO(Path(args.ov_model_dir), args.num_beams, args.max_new_tokens)
    warmup(model, [samples[0]["image_path"]], args.warmup)
    summary, rows = evaluate_trocr(model, samples, args.batch_size)

    payload = {"model": "trocr_openvino", "split": args.split, **summary}
    print_json(payload)
    if args.full_report:
        print_trocr_report("openvino", args.split, summary, rows, args.show_worst)
    if args.show_samples:
        print_json({"sample_predictions": rows[: args.show_samples]})
    if args.save_csv:
        save_csv(rows, Path(args.save_csv))
    if args.output_dir:
        save_summary_artifacts(Path(args.output_dir), "trocr_openvino_summary", args.split, payload)


def run_trocr_compare(args: argparse.Namespace) -> None:
    samples = collect_trocr_samples(Path(args.split_dir), Path(args.image_dir), args.split, args.limit)
    ov_model = TrOCROpenVINO(Path(args.ov_model_dir), args.num_beams, args.max_new_tokens)
    resolved_pt_device = resolve_device(args.pt_device)
    pt_model = TrOCRPyTorch(
        Path(args.pt_model_dir),
        args.num_beams,
        args.max_new_tokens,
        resolved_pt_device,
        use_fp16=args.pt_fp16,
    )

    warmup(ov_model, [samples[0]["image_path"]], args.warmup)
    warmup(pt_model, [samples[0]["image_path"]], args.warmup)

    ov_summary, ov_rows = evaluate_trocr(ov_model, samples, args.batch_size)
    pt_summary, pt_rows = evaluate_trocr(pt_model, samples, args.batch_size)

    comparison_payload = compare_summaries(ov_summary, pt_summary)
    print_json(comparison_payload)
    print_trocr_comparison_report(ov_summary, pt_summary)
    if args.full_report:
        print_trocr_report("openvino", args.split, ov_summary, ov_rows, args.show_worst)
        print_trocr_report("pytorch", args.split, pt_summary, pt_rows, args.show_worst)
    if args.output_dir:
        output_dir = Path(args.output_dir)
        save_csv(ov_rows, auto_output_path(output_dir, "trocr_openvino_predictions", args.split))
        save_csv(pt_rows, auto_output_path(output_dir, "trocr_pytorch_predictions", args.split))
        save_summary_artifacts(output_dir, "trocr_openvino_summary", args.split, {"model": "trocr_openvino", "split": args.split, **ov_summary})
        save_summary_artifacts(
            output_dir,
            "trocr_pytorch_summary",
            args.split,
            {
                "model": "trocr_pytorch",
                "split": args.split,
                "device": resolved_pt_device,
                "fp16": bool(args.pt_fp16 and resolved_pt_device == "cuda"),
                **pt_summary,
            },
        )
        save_summary_artifacts(output_dir, "trocr_comparison_summary", args.split, comparison_payload)
    if args.show_samples:
        print_json(
            {
                "openvino_samples": ov_rows[: args.show_samples],
                "pytorch_samples": pt_rows[: args.show_samples],
            }
        )


def add_resnet_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--ov-model", default=str(DEFAULT_RESNET_OV))
    parser.add_argument("--image-height", type=int, default=64, help="Notebook-compatible height. Use 224 for backend parity.")
    parser.add_argument("--image-width", type=int, default=224, help="Notebook-compatible width. Use 224 for backend parity.")


def add_trocr_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--ov-model-dir", default=str(DEFAULT_TROCR_OV))
    parser.add_argument("--image-dir", default=str(DEFAULT_TROCR_IMAGE_DIR))
    parser.add_argument("--split-dir", default=str(DEFAULT_TROCR_SPLIT_DIR))
    parser.add_argument("--num-beams", type=int, default=3)
    parser.add_argument("--max-new-tokens", type=int, default=128)


def main() -> None:
    parser = argparse.ArgumentParser(description="Infer or benchmark the optimized OpenVINO OCR models.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    resnet_sample = subparsers.add_parser("resnet-sample", help="Infer one image with ResNet OpenVINO.")
    add_resnet_common_args(resnet_sample)
    resnet_sample.add_argument("--image", required=True)
    resnet_sample.set_defaults(func=run_resnet_sample)

    resnet_eval = subparsers.add_parser("resnet-eval", help="Evaluate ResNet OpenVINO on an ImageFolder split.")
    add_resnet_common_args(resnet_eval)
    resnet_eval.add_argument("--dataset-dir", default=str(DEFAULT_RESNET_DATA))
    resnet_eval.add_argument("--split", choices=["train", "val", "test"], default="test")
    resnet_eval.add_argument("--batch-size", type=int, default=32)
    resnet_eval.add_argument("--limit", type=int, default=None)
    resnet_eval.add_argument("--warmup", type=int, default=1)
    resnet_eval.add_argument("--show-samples", type=int, default=5)
    resnet_eval.add_argument("--full-report", action="store_true")
    resnet_eval.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    resnet_eval.add_argument("--save-csv", default=None)
    resnet_eval.set_defaults(func=run_resnet_eval)

    resnet_compare = subparsers.add_parser("resnet-compare", help="Compare ResNet OpenVINO vs PyTorch.")
    add_resnet_common_args(resnet_compare)
    resnet_compare.add_argument("--dataset-dir", default=str(DEFAULT_RESNET_DATA))
    resnet_compare.add_argument("--pt-model", default=str(DEFAULT_RESNET_PT))
    resnet_compare.add_argument("--pt-device", choices=["auto", "cpu", "cuda"], default="cpu")
    resnet_compare.add_argument("--pt-fp16", action="store_true")
    resnet_compare.add_argument("--split", choices=["train", "val", "test"], default="test")
    resnet_compare.add_argument("--batch-size", type=int, default=32)
    resnet_compare.add_argument("--limit", type=int, default=None)
    resnet_compare.add_argument("--warmup", type=int, default=1)
    resnet_compare.add_argument("--show-samples", type=int, default=3)
    resnet_compare.add_argument("--full-report", action="store_true")
    resnet_compare.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    resnet_compare.set_defaults(func=run_resnet_compare)

    resnet_report = subparsers.add_parser("resnet-report", help="Notebook-style full report for ResNet on a split.")
    add_resnet_common_args(resnet_report)
    resnet_report.add_argument("--dataset-dir", default=str(DEFAULT_RESNET_DATA))
    resnet_report.add_argument("--pt-model", default=str(DEFAULT_RESNET_PT))
    resnet_report.add_argument("--pt-device", choices=["auto", "cpu", "cuda"], default="cpu")
    resnet_report.add_argument("--pt-fp16", action="store_true")
    resnet_report.add_argument("--split", choices=["train", "val", "test"], default="test")
    resnet_report.add_argument("--batch-size", type=int, default=32)
    resnet_report.add_argument("--limit", type=int, default=None)
    resnet_report.add_argument("--warmup", type=int, default=1)
    resnet_report.add_argument("--show-samples", type=int, default=3)
    resnet_report.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    resnet_report.set_defaults(func=run_resnet_compare, full_report=True)

    trocr_sample = subparsers.add_parser("trocr-sample", help="Infer one image with TrOCR OpenVINO.")
    add_trocr_common_args(trocr_sample)
    trocr_sample.add_argument("--image", required=True)
    trocr_sample.set_defaults(func=run_trocr_sample)

    trocr_eval = subparsers.add_parser("trocr-eval", help="Evaluate TrOCR OpenVINO on a jsonl split.")
    add_trocr_common_args(trocr_eval)
    trocr_eval.add_argument("--split", choices=["train", "val", "test"], default="test")
    trocr_eval.add_argument("--batch-size", type=int, default=4)
    trocr_eval.add_argument("--limit", type=int, default=None)
    trocr_eval.add_argument("--warmup", type=int, default=1)
    trocr_eval.add_argument("--show-samples", type=int, default=5)
    trocr_eval.add_argument("--show-worst", type=int, default=10)
    trocr_eval.add_argument("--full-report", action="store_true")
    trocr_eval.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    trocr_eval.add_argument("--save-csv", default=None)
    trocr_eval.set_defaults(func=run_trocr_eval)

    trocr_compare = subparsers.add_parser("trocr-compare", help="Compare TrOCR OpenVINO vs PyTorch.")
    add_trocr_common_args(trocr_compare)
    trocr_compare.add_argument("--pt-model-dir", default=str(DEFAULT_TROCR_PT))
    trocr_compare.add_argument("--pt-device", choices=["auto", "cpu", "cuda"], default="cpu")
    trocr_compare.add_argument("--pt-fp16", action="store_true")
    trocr_compare.add_argument("--split", choices=["train", "val", "test"], default="test")
    trocr_compare.add_argument("--batch-size", type=int, default=4)
    trocr_compare.add_argument("--limit", type=int, default=None)
    trocr_compare.add_argument("--warmup", type=int, default=1)
    trocr_compare.add_argument("--show-samples", type=int, default=3)
    trocr_compare.add_argument("--show-worst", type=int, default=10)
    trocr_compare.add_argument("--full-report", action="store_true")
    trocr_compare.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    trocr_compare.set_defaults(func=run_trocr_compare)

    trocr_report = subparsers.add_parser("trocr-report", help="Notebook-style full report for TrOCR on a split.")
    add_trocr_common_args(trocr_report)
    trocr_report.add_argument("--pt-model-dir", default=str(DEFAULT_TROCR_PT))
    trocr_report.add_argument("--pt-device", choices=["auto", "cpu", "cuda"], default="cpu")
    trocr_report.add_argument("--pt-fp16", action="store_true")
    trocr_report.add_argument("--split", choices=["train", "val", "test"], default="test")
    trocr_report.add_argument("--batch-size", type=int, default=4)
    trocr_report.add_argument("--limit", type=int, default=None)
    trocr_report.add_argument("--warmup", type=int, default=1)
    trocr_report.add_argument("--show-samples", type=int, default=3)
    trocr_report.add_argument("--show-worst", type=int, default=10)
    trocr_report.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    trocr_report.set_defaults(func=run_trocr_compare, full_report=True)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
