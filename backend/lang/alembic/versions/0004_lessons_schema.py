"""lessons content — concepts / rules / drills / lessons + sense_relations.bridge

Учебный контент живёт в той же БД, что лексический граф (ADR 069 D1). Дриллы
join'ятся со словарём через `drill_words`. Плюс `sense_relations.bridge`
(образ-мост, ADR 069 D4) — nullable, готовит конвейер образов. `senses.image`
уже добавлена миграцией 0002 — здесь не трогаем.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# String-valued enums (native_enum=False) → portable across SQLite/Postgres.
_lesson_level = sa.Enum(
    "l0", "l1", "l2", "l3", "l4", "l5", name="lesson_level", native_enum=False
)
_source = sa.Enum("auto", "curated", name="source", native_enum=False)


def upgrade() -> None:
    # образ-мост между смыслами (ADR 069 D4) — данных пока нет.
    with op.batch_alter_table("sense_relations") as batch:
        batch.add_column(sa.Column("bridge", sa.String(), nullable=True))

    op.create_table(
        "concepts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("principle", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("examples", sa.JSON(), nullable=True),
        sa.Column("source", _source, nullable=False),
    )

    op.create_table(
        "rules",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("source", _source, nullable=False),
    )

    op.create_table(
        "drills",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("level", _lesson_level, nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column(
            "rule_id",
            sa.String(),
            sa.ForeignKey("rules.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("grabo_tag", sa.String(), nullable=False),
        sa.Column("source", _source, nullable=False),
    )
    op.create_index("ix_drills_rule_id", "drills", ["rule_id"])

    op.create_table(
        "drill_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "drill_id",
            sa.String(),
            sa.ForeignKey("drills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("prompt_ru", sa.String(), nullable=False),
        sa.Column("context", sa.String(), nullable=True),
        sa.Column("answer_en", sa.String(), nullable=False),
        sa.Column("accept", sa.JSON(), nullable=True),
        sa.Column("near_miss", sa.JSON(), nullable=True),
        sa.Column("grabo_tag", sa.String(), nullable=True),
    )
    op.create_index("ix_drill_items_drill_id", "drill_items", ["drill_id"])

    op.create_table(
        "lessons",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("level", _lesson_level, nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("intro", sa.String(), nullable=True),
        sa.Column("source", _source, nullable=False),
    )

    _link(
        "lesson_concepts",
        ("lesson_id", "lessons.id"),
        ("concept_id", "concepts.id"),
    )
    _link("lesson_rules", ("lesson_id", "lessons.id"), ("rule_id", "rules.id"))
    _link("lesson_drills", ("lesson_id", "lessons.id"), ("drill_id", "drills.id"))
    _link("drill_concepts", ("drill_id", "drills.id"), ("concept_id", "concepts.id"))
    _link("drill_words", ("drill_id", "drills.id"), ("word_id", "words.id", sa.Integer))
    _link(
        "concept_related_rules",
        ("concept_id", "concepts.id"),
        ("rule_id", "rules.id"),
    )
    _link(
        "concept_related_concepts",
        ("concept_id", "concepts.id"),
        ("related_id", "concepts.id"),
    )


def _link(table: str, left: tuple, right: tuple) -> None:
    """Ordered M2M join table: two FK PKs + a `position` column."""

    def _col(spec: tuple):
        name, target = spec[0], spec[1]
        coltype = spec[2]() if len(spec) > 2 else sa.String()
        return sa.Column(
            name,
            coltype,
            sa.ForeignKey(target, ondelete="CASCADE"),
            primary_key=True,
        )

    op.create_table(
        table,
        _col(left),
        _col(right),
        sa.Column("position", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    for table in (
        "concept_related_concepts",
        "concept_related_rules",
        "drill_words",
        "drill_concepts",
        "lesson_drills",
        "lesson_rules",
        "lesson_concepts",
        "lessons",
    ):
        op.drop_table(table)
    op.drop_index("ix_drill_items_drill_id", table_name="drill_items")
    op.drop_table("drill_items")
    op.drop_index("ix_drills_rule_id", table_name="drills")
    op.drop_table("drills")
    op.drop_table("rules")
    op.drop_table("concepts")
    with op.batch_alter_table("sense_relations") as batch:
        batch.drop_column("bridge")
