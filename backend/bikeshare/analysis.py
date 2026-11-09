"""Pure filtering and descriptive statistics for BikeShare trip frames."""

import pandas as pd

from .data import DEMOGRAPHIC_COLUMNS, REQUIRED_COLUMNS

MONTHS = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6}
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


# Input validation and filter-value normalization.
def _validate_frame(frame: pd.DataFrame) -> None:
    missing = sorted(REQUIRED_COLUMNS - set(frame.columns))
    if missing:
        raise ValueError(f"DataFrame is missing required columns: {', '.join(missing)}")


def _normalize_month(month: int | str | None) -> int | None:
    if month is None or (isinstance(month, str) and month.strip().lower() == "all"):
        return None
    if isinstance(month, str):
        value = month.strip().lower()
        if value in MONTHS:
            return MONTHS[value]
        if value.isdigit():
            month = int(value)
        else:
            raise ValueError("month must be 'all', a month name from January to June, or an integer from 1 to 6")
    if isinstance(month, bool) or not isinstance(month, int) or not 1 <= month <= 6:
        raise ValueError("month must be 'all', a month name from January to June, or an integer from 1 to 6")
    return month


def _normalize_weekday(weekday: str | None) -> str | None:
    if weekday is None or (isinstance(weekday, str) and weekday.strip().lower() == "all"):
        return None
    if not isinstance(weekday, str):
        raise ValueError("weekday must be 'all' or a weekday name")
    match = next((day for day in WEEKDAYS if day.lower() == weekday.strip().lower()), None)
    if match is None:
        raise ValueError("weekday must be 'all' or a weekday name")
    return match


def filter_trips(
    frame: pd.DataFrame,
    *,
    month: int | str | None = None,
    weekday: str | None = None,
) -> pd.DataFrame:
    """Return trips filtered by their start time, without modifying ``frame``."""
    _validate_frame(frame)
    month_value = _normalize_month(month)
    weekday_value = _normalize_weekday(weekday)
    starts = pd.to_datetime(frame["Start Time"], errors="coerce")
    mask = starts.notna()
    if month_value is not None:
        mask &= starts.dt.month.eq(month_value)
    if weekday_value is not None:
        mask &= starts.dt.day_name().eq(weekday_value)
    result = frame.loc[mask].copy()
    result["Start Time"] = starts.loc[mask]
    return result


# Trip counts and duration summaries.
def _counts(series: pd.Series, field: str) -> list[dict[str, object]]:
    counts = series.dropna().value_counts()
    return [
        {field: value.item() if hasattr(value, "item") else value, "trips": int(count)}
        for value, count in counts.items()
    ]


def _duration_stats(frame: pd.DataFrame) -> dict[str, float | None]:
    values = pd.to_numeric(frame["Trip Duration"], errors="coerce").dropna()
    if values.empty:
        return {"total": None, "average": None}
    return {"total": float(values.sum()), "average": float(values.mean())}


# Popular month, weekday, and hour summaries for charts and rankings.
def _popular_times(starts: pd.Series, limit: int) -> dict[str, list[dict[str, object]]]:
    month_counts = starts.dt.month.value_counts().sort_index()
    weekday_counts = starts.dt.day_name().value_counts()
    hour_counts = starts.dt.hour.value_counts().sort_index()
    months = {
        pd.Timestamp(2000, int(month), 1).month_name(): int(count)
        for month, count in month_counts.items()
    }
    # Keep all weekdays, including zero-count days, for complete chart distributions.
    weekdays = {day: int(weekday_counts.get(day, 0)) for day in WEEKDAYS}
    hours = {int(hour): int(count) for hour, count in hour_counts.items()}
    # Break ties consistently: calendar month, alphabetical weekday, and ascending hour.
    top_months = sorted(months.items(), key=lambda item: (-item[1], MONTHS[item[0].lower()]))[:limit]
    top_weekdays = sorted(weekdays.items(), key=lambda item: (-item[1], item[0]))[:limit]
    top_hours = sorted(hours.items(), key=lambda item: (-item[1], item[0]))[:limit]
    return {
        "months": [{"month": name, "trips": count} for name, count in top_months],
        "weekdays": [{"weekday": name, "trips": count} for name, count in top_weekdays],
        "hours": [{"hour": hour, "trips": count} for hour, count in top_hours],
        "distributions": {
            "months": [{"month": name, "trips": count} for name, count in months.items()],
            "weekdays": [{"weekday": day, "trips": weekdays[day]} for day in WEEKDAYS],
            "hours": [{"hour": hour, "trips": count} for hour, count in hours.items()],
        },
    }


# Available demographic counts and birth-year summaries.
def _demographics(frame: pd.DataFrame) -> dict[str, object]:
    result: dict[str, object] = {}
    for column in sorted(DEMOGRAPHIC_COLUMNS):
        if column not in frame.columns:
            result[column] = {"available": False, "counts": [], "missing_count": None}
            continue
        values = frame[column]
        entry: dict[str, object] = {
            "available": True,
            "counts": _counts(values, "value"),
            "missing_count": int(values.isna().sum()),
        }
        if column == "Birth Year":
            numeric = pd.to_numeric(values, errors="coerce").dropna()
            modes = numeric.mode()
            entry.update({
                "min": float(numeric.min()) if not numeric.empty else None,
                "max": float(numeric.max()) if not numeric.empty else None,
                "mode": float(modes.iloc[0]) if not modes.empty else None,
            })
        result[column] = entry
    return result


# Assemble the complete statistics response from the filtered trips.
def analyze_trips(
    frame: pd.DataFrame,
    *,
    month: int | str | None = None,
    weekday: str | None = None,
    top_n: int = 10,
) -> dict[str, object]:
    """Calculate legacy statistics and chart-ready frequency summaries."""
    if isinstance(top_n, bool) or not isinstance(top_n, int) or top_n < 1:
        raise ValueError("top_n must be a positive integer")
    selected = filter_trips(frame, month=month, weekday=weekday)
    starts = selected["Start Time"]
    valid_routes = selected.dropna(subset=["Start Station", "End Station"])
    routes = valid_routes.groupby(["Start Station", "End Station"], sort=False).size()
    routes = routes.sort_values(ascending=False, kind="stable").head(top_n)
    route_rows = [
        {"start_station": start, "end_station": end, "trips": int(n)}
        for (start, end), n in routes.items()
    ]
    times = _popular_times(starts, top_n)
    return {
        "trip_count": len(selected),
        "duration_seconds": _duration_stats(selected),
        "popular_months": times["months"],
        "popular_weekdays": times["weekdays"],
        "popular_hours": times["hours"],
        "distributions": times["distributions"],
        "stations": {
            "start": _counts(selected["Start Station"], "station")[:top_n],
            "end": _counts(selected["End Station"], "station")[:top_n],
        },
        "routes": route_rows,
        "rider_types": _counts(selected["User Type"], "type"),
        "demographics": _demographics(selected),
    }
