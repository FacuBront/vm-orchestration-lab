# -----------------------------------------------------------------------------
# Frontend MVP (Flask + Jinja2 + Chart.js) del laboratorio.
# Corre con gunicorn en el puerto 8000, como usuario sin privilegios.
# Se levanta con el overlay docker-compose.frontend.yml.
# -----------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REPORTS_DIR=/app/reports

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates/ templates/
COPY static/ static/

RUN useradd --create-home --uid 10001 frontend
USER frontend

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-", "app:app"]
