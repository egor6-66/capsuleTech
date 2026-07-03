"""Naive-UTC datetime helper.

All timestamps are stored as naive UTC datetimes and compared in Python (never
in SQL) — this sidesteps SQLAlchemy's SQLite dialect not round-tripping
tz-aware datetimes.
"""

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
