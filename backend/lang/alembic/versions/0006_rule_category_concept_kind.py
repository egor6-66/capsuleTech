"""rule.category/sort_order + concept.kind/sort_order — accordion-IA grouping (ADR 069)

Grouping facets for the reference-rules and concepts accordions: each row carries
which group it belongs to (`category` / `kind`) and its position within that group
(`sort_order`). Portable string enums (native_enum=False). Existing rows backfill:
category → `grammar`, kind → `approach`, sort_order → 100 (real values arrive on
the next vault reimport). Ru group labels + group order stay a front concern.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_category = sa.Enum(
    "phonetics", "grammar", "speech", name="rule_category", native_enum=False
)
_kind = sa.Enum(
    "approach", "pattern", "recommendation", name="concept_kind", native_enum=False
)


def upgrade() -> None:
    with op.batch_alter_table("rules") as batch:
        batch.add_column(
            sa.Column(
                "category", _category, nullable=False, server_default="grammar"
            )
        )
        batch.add_column(
            sa.Column(
                "sort_order", sa.Integer(), nullable=False, server_default="100"
            )
        )
    with op.batch_alter_table("concepts") as batch:
        batch.add_column(
            sa.Column("kind", _kind, nullable=False, server_default="approach")
        )
        batch.add_column(
            sa.Column(
                "sort_order", sa.Integer(), nullable=False, server_default="100"
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("concepts") as batch:
        batch.drop_column("sort_order")
        batch.drop_column("kind")
    with op.batch_alter_table("rules") as batch:
        batch.drop_column("sort_order")
        batch.drop_column("category")
