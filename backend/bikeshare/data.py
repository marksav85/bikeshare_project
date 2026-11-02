"""Read and validate the project's CSV inputs."""

from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CITY_DATA = {
    "chicago": "chicago.csv",
    "new_york_city": "new_york_city.csv",
    "washington": "washington.csv",
}
REQUIRED_COLUMNS = {
    "Start Time", "End Time", "Trip Duration", "Start Station", "End Station", "User Type",
}
DEMOGRAPHIC_COLUMNS = {"Gender", "Birth Year"}


class DataValidationError(ValueError):
    """Raised when an input dataset does not meet the expected schema."""


def load_city_data(city: str, *, data_dir: Path | None = None) -> pd.DataFrame:
    """Load one city's CSV, normalize supported fields, and ignore its saved index."""
    if city not in CITY_DATA:
        raise ValueError(f"Unknown city {city!r}; expected one of {', '.join(CITY_DATA)}")

    root = Path(data_dir) if data_dir is not None else PROJECT_ROOT
    path = root / CITY_DATA[city]
    frame = pd.read_csv(path)
    unnamed = [column for column in frame.columns if str(column).startswith("Unnamed:") or column == ""]
    if unnamed:
        frame = frame.drop(columns=unnamed)
    missing = sorted(REQUIRED_COLUMNS - set(frame.columns))
    if missing:
        raise DataValidationError(f"{path.name} is missing required columns: {', '.join(missing)}")

    frame = frame.copy()
    frame["Start Time"] = pd.to_datetime(frame["Start Time"], errors="coerce")
    frame["End Time"] = pd.to_datetime(frame["End Time"], errors="coerce")
    frame["Trip Duration"] = pd.to_numeric(frame["Trip Duration"], errors="coerce")
    if "Birth Year" in frame:
        frame["Birth Year"] = pd.to_numeric(frame["Birth Year"], errors="coerce")
    for column in ("Start Station", "End Station", "User Type", "Gender"):
        if column in frame:
            frame[column] = frame[column].astype("string").str.strip().replace("", pd.NA)
    return frame
