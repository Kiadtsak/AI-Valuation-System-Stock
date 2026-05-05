"""
Structured JSON logging for production-grade observability.
- JSON in production (parseable by Datadog, CloudWatch, etc.)
- Pretty text in dev
- Includes trace context (request_id, user_id) when available
- Rotates files automatically
"""
import json
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from contextvars import ContextVar
from typing import Any

from app.core.config import settings

# Request-scoped context (for tracing)
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)


class JSONFormatter(logging.Formatter):
    """Format log records as single-line JSON for log aggregation."""

    RESERVED = {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message", "module",
        "msecs", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno,
        }

        # Add trace context
        rid = request_id_ctx.get()
        if rid:
            payload["request_id"] = rid
        uid = user_id_ctx.get()
        if uid:
            payload["user_id"] = uid

        # Exception info
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        # Extra fields passed via logger.info("msg", extra={...})
        for k, v in record.__dict__.items():
            if k not in self.RESERVED and not k.startswith("_"):
                try:
                    json.dumps(v)
                    payload[k] = v
                except (TypeError, ValueError):
                    payload[k] = str(v)

        return json.dumps(payload, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    """Pretty colored format for dev."""

    COLORS = {
        "DEBUG": "\033[36m",    # cyan
        "INFO": "\033[32m",     # green
        "WARNING": "\033[33m",  # yellow
        "ERROR": "\033[31m",    # red
        "CRITICAL": "\033[35m", # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        rid = request_id_ctx.get()
        rid_str = f" [{rid[:8]}]" if rid else ""
        ts = self.formatTime(record, "%H:%M:%S")
        return (
            f"{color}{record.levelname:8}{self.RESET} {ts}{rid_str} "
            f"{record.name}: {record.getMessage()}"
        )


def setup_logging() -> None:
    """Configure root logger. Call once at app startup."""
    root = logging.getLogger()
    root.setLevel(settings.LOG_LEVEL)

    # Clear existing handlers (uvicorn adds its own)
    for h in root.handlers[:]:
        root.removeHandler(h)

    # Console
    console = logging.StreamHandler(sys.stdout)
    if settings.LOG_FORMAT == "json":
        console.setFormatter(JSONFormatter())
    else:
        console.setFormatter(TextFormatter())
    root.addHandler(console)

    # File (with rotation)
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(JSONFormatter())  # always JSON to file
    root.addHandler(file_handler)

    # Tame noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
