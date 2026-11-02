from __future__ import annotations

import pandas as pd
import pytest

from bikeshare.data import DataValidationError, check_dataset_readiness, load_city_data


def test_loader_uses_data_directory_and_handles_optional_fields(tmp_path) -> None:
    pd.DataFrame({
        "": [17], "Start Time": ["2017-01-02 08:00:00"], "End Time": ["2017-01-02 08:05:00"],
        "Trip Duration": ["300"], "Start Station": [" A "], "End Station": ["B"],
        "User Type": ["Subscriber"],
    }).to_csv(tmp_path / "washington.csv", index=False)
    frame = load_city_data("washington", data_dir=tmp_path)
    assert "" not in frame.columns
    assert frame.loc[0, "Start Station"] == "A"
    assert pd.api.types.is_datetime64_any_dtype(frame["Start Time"])
    assert frame.loc[0, "Trip Duration"] == 300


def test_loader_rejects_unknown_city_and_missing_required_column(tmp_path) -> None:
    with pytest.raises(ValueError, match="Unknown city"):
        load_city_data("boston", data_dir=tmp_path)
    pd.DataFrame({"Start Time": ["2017-01-01"]}).to_csv(tmp_path / "chicago.csv", index=False)
    with pytest.raises(DataValidationError, match="missing required columns"):
        load_city_data("chicago", data_dir=tmp_path)


def test_readiness_checks_headers_without_reading_dataset_rows(tmp_path) -> None:
    columns = [
        "Start Time", "End Time", "Trip Duration", "Start Station", "End Station", "User Type",
    ]
    for city in ("chicago", "new_york_city", "washington"):
        (tmp_path / f"{city}.csv").write_text(
            ",".join(columns) + "\n\"malformed row that should not be parsed\n",
            encoding="utf-8",
        )

    assert check_dataset_readiness(data_dir=tmp_path) == {
        "chicago": True,
        "new_york_city": True,
        "washington": True,
    }


def test_readiness_marks_missing_and_invalid_headers_not_ready(tmp_path) -> None:
    (tmp_path / "chicago.csv").write_text("Start Time,User Type\n", encoding="utf-8")
    assert check_dataset_readiness(data_dir=tmp_path) == {
        "chicago": False,
        "new_york_city": False,
        "washington": False,
    }
