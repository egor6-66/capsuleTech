"""Typed enums for the identity schema (ADR 068 D2).

Stored as their string values (native_enum=False in models) for SQLite/Postgres
portability — a drop-in dialect switch must not depend on native ENUM types.
"""

from enum import StrEnum


class Role(StrEnum):
    """Account role. Community-domain roles (banned/rating/etc) live elsewhere."""

    MEMBER = "member"
    ADMIN = "admin"
