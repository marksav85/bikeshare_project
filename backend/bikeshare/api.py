"""FastAPI routes for the read-only BikeShare statistics API."""

from collections.abc import Callable
from functools import lru_cache
import logging
from typing import Annotated, Literal

import pandas as pd
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from .analysis import WEEKDAYS, analyze_trips
from .data import CITY_DATA, DataValidationError, check_dataset_readiness, load_city_data

logger = logging.getLogger(__name__)
CityId = Literal["chicago", "new_york_city", "washington"]
WeekdayId = Literal[
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]
DataLoader = Callable[[str], pd.DataFrame]
ReadinessChecker = Callable[[], dict[str, bool]]

CITY_NAMES = {
    "chicago": "Chicago",
    "new_york_city": "New York City",
    "washington": "Washington",
}
MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
}


# Cached data loading and response-shaping helpers.
@lru_cache(maxsize=len(CITY_DATA))
def _cached_city_data(city: str) -> pd.DataFrame:
    """Load each static CSV once per process to avoid repeated parsing."""
    return load_city_data(city)


def _load_or_503(loader: DataLoader, city: str) -> pd.DataFrame | JSONResponse:
    try:
        return loader(city)
    except (OSError, UnicodeError, DataValidationError, pd.errors.ParserError):
        logger.exception("Could not load BikeShare data for city %s", city)
        return JSONResponse(
            status_code=503,
            content={"detail": "Data is temporarily unavailable for the requested city."},
        )


def _demographic_response(stats: dict[str, object]) -> dict[str, object]:
    raw = stats["demographics"]
    assert isinstance(raw, dict)
    gender = raw["Gender"]
    birth_year = raw["Birth Year"]
    assert isinstance(gender, dict) and isinstance(birth_year, dict)
    return {"gender": gender, "birth_year": birth_year}


def create_app(
    data_loader: DataLoader | None = None,
    readiness_checker: ReadinessChecker | None = None,
) -> FastAPI:
    """Create an app; a loader override keeps endpoint tests isolated from large CSVs."""
    loader = data_loader or _cached_city_data
    check_readiness = readiness_checker or check_dataset_readiness
    app = FastAPI(title="BikeShare API", version="1.0.0")

    # Process health and dataset readiness endpoints.
    @app.get("/api/healthz")
    async def health() -> dict[str, str]:
        """Report process health without touching the datasets."""
        return {"status": "ok"}

    @app.get("/api/readyz", response_model=None)
    def readiness() -> dict[str, object] | JSONResponse:
        """Check each CSV's availability and required header without loading rows."""
        checked = check_readiness()
        datasets = {city: bool(checked.get(city, False)) for city in CITY_DATA}
        if not all(datasets.values()):
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "datasets": datasets},
            )
        return {"status": "ready", "datasets": datasets}

    # City and available-filter discovery endpoints.
    @app.get("/api/cities")
    def list_cities() -> dict[str, object]:
        return {
            "cities": [
                {"id": city, "name": CITY_NAMES[city]}
                for city in CITY_DATA
            ]
        }

    @app.get("/api/filters", response_model=None)
    def get_filters(city: CityId) -> dict[str, object] | JSONResponse:
        frame = _load_or_503(loader, city)
        if isinstance(frame, JSONResponse):
            return frame
        starts = pd.to_datetime(frame["Start Time"], errors="coerce").dropna()
        months_available = set(starts.dt.month.unique().tolist())
        weekdays_available = set(starts.dt.day_name().unique().tolist())
        return {
            "city": city,
            "months": [
                {"value": month, "label": name}
                for month, name in MONTH_NAMES.items()
                if month in months_available
            ],
            "weekdays": [
                {"value": day.lower(), "label": day}
                for day in WEEKDAYS
                if day in weekdays_available
            ],
            "demographics": {
                "gender": "Gender" in frame.columns,
                "birth_year": "Birth Year" in frame.columns,
            },
        }

    # Filtered trip-statistics endpoint.
    @app.get("/api/statistics", response_model=None)
    def get_statistics(
        city: CityId,
        month: Annotated[int | None, Query(ge=1, le=6)] = None,
        weekday: WeekdayId | None = None,
    ) -> dict[str, object] | JSONResponse:
        frame = _load_or_503(loader, city)
        if isinstance(frame, JSONResponse):
            return frame
        stats = analyze_trips(frame, month=month, weekday=weekday)
        popular_times = {
            "month": stats["popular_months"],
            "weekday": stats["popular_weekdays"],
            "hour": stats["popular_hours"],
        }
        return {
            "city": city,
            "filters": {"month": month, "weekday": weekday},
            "trip_count": stats["trip_count"],
            "duration_seconds": stats["duration_seconds"],
            "popular_travel_times": popular_times,
            "distributions": stats["distributions"],
            "popular_stations": stats["stations"],
            "popular_routes": stats["routes"],
            "rider_types": stats["rider_types"],
            "demographics": _demographic_response(stats),
        }

    return app


app = create_app()
