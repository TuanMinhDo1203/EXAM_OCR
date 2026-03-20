import argparse

import requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    response = requests.get(f"{args.base_url}/ready", timeout=30)
    response.raise_for_status()
    print(response.json())


if __name__ == "__main__":
    main()
