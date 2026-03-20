import argparse
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--image", required=True)
    args = parser.parse_args()

    image_path = Path(args.image)
    health = requests.get(f"{args.base_url}/health", timeout=5)
    health.raise_for_status()
    print("health:", health.json())

    ready = requests.get(f"{args.base_url}/ready", timeout=5)
    ready.raise_for_status()
    print("ready:", ready.json())

    with image_path.open("rb") as handle:
        response = requests.post(
            f"{args.base_url}/api/ocr/predict",
            files={"file": (image_path.name, handle, "application/octet-stream")},
            timeout=180,
        )
    response.raise_for_status()
    print("ocr:", response.json())


if __name__ == "__main__":
    main()
