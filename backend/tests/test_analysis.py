from __future__ import annotations

import pandas as pd
import pytest

from bikeshare.analysis import analyze_trips, filter_trips


@pytest.fixture
def trips() -> pd.DataFrame:
    return pd.DataFrame({
        "Start Time": pd.to_datetime([
            "2017-01-02 08:00:00", "2017-01-02 08:30:00", "2017-02-03 09:00:00",
            "2017-02-04 10:00:00", "not-a-date",
        ], errors="coerce"),
        "End Time": pd.to_datetime([
            "2017-01-02 08:05:00", "2017-01-02 08:40:00", "2017-02-03 09:10:00",
            "2017-02-04 10:20:00", "2017-02-05 12:00:00",
        ]),
        "Trip Duration": [300, 600, 600, 1_235_662.17, 100],
        "Start Station": ["A", "A", "B", "A", None],
        "End Station": ["B", "B", "C", "B", "C"],
        "User Type": ["Subscriber", "Subscriber", "Customer", "Mystery", None],
        "Gender": ["Male", None, "Female", "Other", None],
        "Birth Year": [1990, None, 1985, 1975, None],
    })


def test_filters_use_start_time_and_do_not_mutate(trips: pd.DataFrame) -> None:
    original_columns = list(trips.columns)
    result = filter_trips(trips, month="january", weekday="MONDAY")
    assert len(result) == 2
    assert list(trips.columns) == original_columns
    assert "month" not in trips


def test_statistics_match_legacy_duration_and_mode_calculations(trips: pd.DataFrame) -> None:
    stats = analyze_trips(trips, month=1, weekday="Monday")
    assert stats["trip_count"] == 2
    assert stats["duration_seconds"] == {"total": 900.0, "average": 450.0}
    assert stats["popular_months"] == [{"month": "January", "trips": 2}]
    assert stats["popular_weekdays"] == [
        {"weekday": "Monday", "trips": 2},
        {"weekday": "Friday", "trips": 0},
        {"weekday": "Saturday", "trips": 0},
        {"weekday": "Sunday", "trips": 0},
        {"weekday": "Thursday", "trips": 0},
        {"weekday": "Tuesday", "trips": 0},
        {"weekday": "Wednesday", "trips": 0},
    ]
    assert len(stats["distributions"]["weekdays"]) == 7
    assert stats["popular_hours"] == [{"hour": 8, "trips": 2}]
    assert stats["stations"]["start"] == [{"station": "A", "trips": 2}]
    assert stats["routes"] == [{"start_station": "A", "end_station": "B", "trips": 2}]
    assert stats["rider_types"] == [{"type": "Subscriber", "trips": 2}]
    assert stats["demographics"]["Gender"]["missing_count"] == 1
    assert stats["demographics"]["Birth Year"]["mode"] == 1990.0


def test_empty_result_has_safe_null_duration_and_empty_lists(trips: pd.DataFrame) -> None:
    stats = analyze_trips(trips, month=6)
    assert stats["trip_count"] == 0
    assert stats["duration_seconds"] == {"total": None, "average": None}
    assert stats["routes"] == []
    assert stats["demographics"]["Gender"]["missing_count"] == 0


def test_missing_demographic_columns_are_explicit(trips: pd.DataFrame) -> None:
    washington = trips.drop(columns=["Gender", "Birth Year"])
    stats = analyze_trips(washington)
    assert stats["demographics"]["Gender"] == {
        "available": False, "counts": [], "missing_count": None,
    }
    assert stats["demographics"]["Birth Year"]["available"] is False


@pytest.mark.parametrize("month", [0, 7, "October", True])
def test_invalid_month_is_rejected(trips: pd.DataFrame, month: object) -> None:
    with pytest.raises(ValueError, match="month"):
        filter_trips(trips, month=month)  # type: ignore[arg-type]


def test_invalid_weekday_and_top_limit_are_rejected(trips: pd.DataFrame) -> None:
    with pytest.raises(ValueError, match="weekday"):
        filter_trips(trips, weekday="Funday")
    with pytest.raises(ValueError, match="top_n"):
        analyze_trips(trips, top_n=0)


def test_long_valid_duration_and_unexpected_category_are_preserved(trips: pd.DataFrame) -> None:
    stats = analyze_trips(trips, month=2)
    assert stats["duration_seconds"]["total"] == 1_236_262.17
    assert {item["type"] for item in stats["rider_types"]} == {"Customer", "Mystery"}


def test_station_and_route_ties_keep_first_seen_order(trips: pd.DataFrame) -> None:
    tied = pd.DataFrame({
        "Start Time": pd.to_datetime(["2017-01-02 08:00", "2017-01-02 08:01"]),
        "End Time": pd.to_datetime(["2017-01-02 08:05", "2017-01-02 08:06"]),
        "Trip Duration": [300, 300],
        "Start Station": ["Z station", "A station"],
        "End Station": ["End Z", "End A"],
        "User Type": ["Subscriber", "Customer"],
    })
    first = analyze_trips(tied)
    second = analyze_trips(tied)
    assert first["stations"]["start"] == [
        {"station": "Z station", "trips": 1}, {"station": "A station", "trips": 1},
    ]
    assert first["routes"] == [
        {"start_station": "Z station", "end_station": "End Z", "trips": 1},
        {"start_station": "A station", "end_station": "End A", "trips": 1},
    ]
    assert first == second
