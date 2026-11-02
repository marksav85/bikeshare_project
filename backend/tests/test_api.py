from __future__ import annotations

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from bikeshare.api import create_app


@pytest.fixture
def sample_frame() -> pd.DataFrame:
    return pd.DataFrame({
        "Start Time": pd.to_datetime([
            "2017-01-02 08:00:00", "2017-01-02 08:30:00", "2017-02-03 09:00:00",
        ]),
        "End Time": pd.to_datetime([
            "2017-01-02 08:05:00", "2017-01-02 08:40:00", "2017-02-03 09:10:00",
        ]),
        "Trip Duration": [300, 600, 600],
        "Start Station": ["A", "A", "B"],
        "End Station": ["B", "B", "C"],
        "User Type": ["Subscriber", "Subscriber", "Customer"],
        "Gender": ["Male", None, "Female"],
        "Birth Year": [1990, None, 1985],
    })


def client_for(frame: pd.DataFrame) -> TestClient:
    return TestClient(create_app(data_loader=lambda requested_city: frame.copy()))


def test_city_listing_has_stable_ids_and_labels(sample_frame: pd.DataFrame) -> None:
    response = client_for(sample_frame).get("/api/cities")
    assert response.status_code == 200
    assert response.json() == {"cities": [
        {"id": "chicago", "name": "Chicago"},
        {"id": "new_york_city", "name": "New York City"},
        {"id": "washington", "name": "Washington"},
    ]}


def test_filters_reflect_available_values_and_columns(sample_frame: pd.DataFrame) -> None:
    response = client_for(sample_frame).get("/api/filters", params={"city": "chicago"})
    assert response.status_code == 200
    assert response.json() == {
        "city": "chicago",
        "months": [{"value": 1, "label": "January"}, {"value": 2, "label": "February"}],
        "weekdays": [
            {"value": "monday", "label": "Monday"},
            {"value": "friday", "label": "Friday"},
        ],
        "demographics": {"gender": True, "birth_year": True},
    }


def test_statistics_request_returns_contract_and_applies_filters(sample_frame: pd.DataFrame) -> None:
    response = client_for(sample_frame).get(
        "/api/statistics", params={"city": "chicago", "month": 1, "weekday": "monday"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "chicago"
    assert body["filters"] == {"month": 1, "weekday": "monday"}
    assert body["trip_count"] == 2
    assert body["duration_seconds"] == {"total": 900.0, "average": 450.0}
    assert body["popular_travel_times"]["weekday"] == [
        {"weekday": "Monday", "trips": 2},
        {"weekday": "Friday", "trips": 0},
        {"weekday": "Saturday", "trips": 0},
        {"weekday": "Sunday", "trips": 0},
        {"weekday": "Thursday", "trips": 0},
        {"weekday": "Tuesday", "trips": 0},
        {"weekday": "Wednesday", "trips": 0},
    ]
    assert len(body["distributions"]["weekdays"]) == 7
    assert body["popular_stations"]["start"] == [{"station": "A", "trips": 2}]
    assert body["popular_routes"] == [
        {"start_station": "A", "end_station": "B", "trips": 2}
    ]
    assert body["rider_types"] == [{"type": "Subscriber", "trips": 2}]
    assert body["demographics"]["gender"]["missing_count"] == 1


def test_optional_filters_can_be_omitted(sample_frame: pd.DataFrame) -> None:
    response = client_for(sample_frame).get("/api/statistics", params={"city": "chicago"})
    assert response.status_code == 200
    assert response.json()["filters"] == {"month": None, "weekday": None}
    assert response.json()["trip_count"] == 3


@pytest.mark.parametrize("params", [
    {},
    {"city": "boston"},
    {"city": "chicago", "month": 0},
    {"city": "chicago", "month": 7},
    {"city": "chicago", "month": "june"},
    {"city": "chicago", "weekday": "Funday"},
    {"city": "chicago", "weekday": "Monday"},
])
def test_invalid_query_parameters_return_422(
    sample_frame: pd.DataFrame, params: dict[str, object]
) -> None:
    response = client_for(sample_frame).get("/api/statistics", params=params)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_empty_result_has_null_durations_and_available_demographics(sample_frame: pd.DataFrame) -> None:
    response = client_for(sample_frame).get(
        "/api/statistics", params={"city": "chicago", "month": 6}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trip_count"] == 0
    assert body["duration_seconds"] == {"total": None, "average": None}
    assert body["popular_routes"] == []
    assert body["demographics"]["gender"]["available"] is True
    assert body["demographics"]["gender"]["missing_count"] == 0


def test_washington_demographics_are_unavailable(sample_frame: pd.DataFrame) -> None:
    frame = sample_frame.drop(columns=["Gender", "Birth Year"])
    response = client_for(frame).get("/api/statistics", params={"city": "washington"})
    assert response.status_code == 200
    demographics = response.json()["demographics"]
    assert demographics["gender"] == {
        "available": False, "counts": [], "missing_count": None,
    }
    assert demographics["birth_year"]["available"] is False


def test_unavailable_dataset_returns_safe_503() -> None:
    def unavailable(_city: str) -> pd.DataFrame:
        raise FileNotFoundError("/private/data/location/chicago.csv")

    response = TestClient(create_app(data_loader=unavailable)).get(
        "/api/filters", params={"city": "chicago"}
    )
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Data is temporarily unavailable for the requested city."
    }
    assert "/private/data" not in response.text


def test_health_endpoint_does_not_check_or_load_datasets() -> None:
    def fail_if_checked() -> dict[str, bool]:
        raise AssertionError("health must not inspect datasets")

    response = TestClient(create_app(readiness_checker=fail_if_checked)).get("/api/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_endpoint_reports_dataset_state_safely() -> None:
    response = TestClient(create_app(
        readiness_checker=lambda: {
            "chicago": True,
            "new_york_city": False,
            "washington": True,
        }
    )).get("/api/readyz")
    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "datasets": {"chicago": True, "new_york_city": False, "washington": True},
    }


def test_readiness_endpoint_returns_ready_when_all_headers_are_valid() -> None:
    response = TestClient(create_app(
        readiness_checker=lambda: {
            "chicago": True,
            "new_york_city": True,
            "washington": True,
        }
    )).get("/api/readyz")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
