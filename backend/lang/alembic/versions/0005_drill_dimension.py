"""drill.dimension — measured axis gating the time-marker check (ADR 069, round-3)

Optional authoring field on a drill: `tense` (default) keeps the strict prompt
time-marker check; `other` (pronouns/articles/copula/…) drops it. Stored so
Exercises-phase filters can slice by dimension. Portable string enum
(native_enum=False). Existing rows backfill to `tense` via server_default.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_dimension = sa.Enum("tense", "other", name="drill_dimension", native_enum=False)


def upgrade() -> None:
    with op.batch_alter_table("drills") as batch:
        batch.add_column(
            sa.Column(
                "dimension",
                _dimension,
                nullable=False,
                server_default="tense",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("drills") as batch:
        batch.drop_column("dimension")
