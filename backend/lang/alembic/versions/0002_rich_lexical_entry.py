"""rich lexical entry — sense columns + sense_examples + frequency band (ADR 064-A)

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_frequency = sa.Enum("high", "medium", "low", name="frequency", native_enum=False)
_connotation = sa.Enum(
    "positive", "neutral", "negative", name="connotation", native_enum=False
)


def upgrade() -> None:
    with op.batch_alter_table("senses") as batch:
        batch.add_column(sa.Column("pron_ru", sa.String(), nullable=True))
        batch.add_column(sa.Column("ipa", sa.String(), nullable=True))
        batch.add_column(sa.Column("image", sa.String(), nullable=True))
        batch.add_column(sa.Column("connotation", _connotation, nullable=True))
        batch.add_column(sa.Column("intensity", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("synset", sa.String(), nullable=True))
        batch.add_column(sa.Column("forms", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("collocations", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("nuance", sa.String(), nullable=True))
        batch.add_column(sa.Column("valency", sa.String(), nullable=True))
        # int rank → band enum. Dev DB is recreated fresh, so no data to cast.
        batch.alter_column(
            "frequency",
            existing_type=sa.Integer(),
            type_=_frequency,
            existing_nullable=True,
            postgresql_using="frequency::text::frequency",
        )
    op.create_index("ix_senses_synset", "senses", ["synset"])

    op.create_table(
        "sense_examples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "sense_id",
            sa.Integer(),
            sa.ForeignKey("senses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("pron_ru", sa.String(), nullable=True),
        sa.Column("ru", sa.String(), nullable=True),
        sa.Column("ipa", sa.String(), nullable=True),
        sa.UniqueConstraint("sense_id", "text", name="uq_sense_examples_sense_text"),
    )
    op.create_index("ix_sense_examples_sense_id", "sense_examples", ["sense_id"])


def downgrade() -> None:
    op.drop_index("ix_sense_examples_sense_id", table_name="sense_examples")
    op.drop_table("sense_examples")
    op.drop_index("ix_senses_synset", table_name="senses")
    with op.batch_alter_table("senses") as batch:
        batch.alter_column(
            "frequency",
            existing_type=_frequency,
            type_=sa.Integer(),
            existing_nullable=True,
        )
        for col in (
            "valency",
            "nuance",
            "collocations",
            "forms",
            "synset",
            "intensity",
            "connotation",
            "image",
            "ipa",
            "pron_ru",
        ):
            batch.drop_column(col)
