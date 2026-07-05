"""Naive-UTC datetime helper (mirrors backend/auth utils).

All timestamps are stored as naive UTC datetimes — SQLAlchemy's SQLite dialect
does not round-trip tz-aware datetimes reliably, and event ordering is compared
in Python where needed.
"""

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
