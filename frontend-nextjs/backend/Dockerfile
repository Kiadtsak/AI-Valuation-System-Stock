# Multi-stage build for production
FROM python:3.12-slim as builder

WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt


FROM python:3.12-slim

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r luxe && useradd -r -g luxe luxe

WORKDIR /app

# Install Python deps from wheels
COPY --from=builder /build/wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache /wheels/*

# Copy app code
COPY --chown=luxe:luxe app ./app
COPY --chown=luxe:luxe Blackend ./Blackend 2>/dev/null || :

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fs http://localhost:8000/health || exit 1

USER luxe
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
