import logging
import sys
from typing import Any


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        if not hasattr(record, "upload_name"):
            record.upload_name = "-"
        return True


def setup_logging(level: str) -> None:
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level.upper())

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level.upper())
    handler.addFilter(RequestContextFilter())
    handler.setFormatter(
        logging.Formatter(
            "[%(asctime)s] %(levelname)s %(name)s request_id=%(request_id)s upload=%(upload_name)s - %(message)s"
        )
    )
    root.addHandler(handler)


def get_logger(name: str, **extra: Any) -> logging.LoggerAdapter:
    return logging.LoggerAdapter(logging.getLogger(name), extra)
