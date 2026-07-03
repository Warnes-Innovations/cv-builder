# Copyright (C) 2024-2025 Gregory R. Warnes
# SPDX-License-Identifier: MIT

# Stage 1: Build the frontend bundle
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY web/ web/
COPY scripts/build.mjs scripts/
RUN npm run build:prod


# Stage 2: Production runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

# System packages:
#   WeasyPrint rendering: cairo, pango, gdk-pixbuf
#   LanguageTool spell check: default-jre-headless (JVM)
#   Misc: fonts, curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf2.0-0 \
        libffi8 \
        shared-mime-info \
        fonts-liberation \
        default-jre-headless \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (pip-only; no conda required)
COPY scripts/requirements.txt scripts/
RUN pip install --no-cache-dir -r scripts/requirements.txt

# Application source
COPY . .

# Replace the placeholder bundle with the prod-built one from stage 1
COPY --from=frontend-builder /app/web/bundle.js web/bundle.js

# Non-root user for security
RUN useradd -m -u 1000 cvapp && chown -R cvapp:cvapp /app
USER cvapp

ENV CI=true \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CV_WEB_HOST=0.0.0.0 \
    CV_WEB_PORT=5001

EXPOSE 5001

# gunicorn: 2 workers (WeasyPrint is memory-heavy ~200 MB/worker)
# 300 s timeout covers PDF generation
CMD ["python", "-m", "gunicorn", \
     "--workers", "2", \
     "--bind", "0.0.0.0:5001", \
     "--timeout", "300", \
     "wsgi:app"]
