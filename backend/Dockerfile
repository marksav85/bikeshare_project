FROM python:3.12-slim-bookworm@sha256:e697c81897302a4c4333bade000d98038fbb21eb064f8ee1fd42d02ebcd9d337

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

COPY backend/requirements-production.txt ./requirements-production.txt
RUN python -m pip install --no-cache-dir --requirement requirements-production.txt \
    && rm requirements-production.txt

COPY --chown=10001:10001 backend/bikeshare/ ./bikeshare/
COPY --chown=10001:10001 --chmod=0444 chicago.csv new_york_city.csv washington.csv /app/

USER 10001:10001
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "bikeshare.api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
