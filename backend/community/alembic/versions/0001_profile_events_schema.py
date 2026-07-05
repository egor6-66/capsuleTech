"""profile + events schema — social core (ADR 071 D3/D4)

Revision ID: 0001
Revises:
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        # user_id = auth user id (by value; auth is a separate DB — ADR 068 D1).
        sa.Column("user_id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("nick", sa.String(), nullable=False),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column("avatar_key", sa.String(), nullable=True),
        sa.Column("contacts", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    # unique=True + index=True on the nick column → a single unique index.
    op.create_index("ix_profiles_nick", "profiles", ["nick"], unique=True)

    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source_app", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("ts", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_events_user_ts", "events", ["user_id", "ts"])
    op.create_index("ix_events_source_kind", "events", ["source_app", "kind"])


def downgrade() -> None:
    op.drop_index("ix_events_source_kind", table_name="events")
    op.drop_index("ix_events_user_ts", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_profiles_nick", table_name="profiles")
    op.drop_table("profiles")
