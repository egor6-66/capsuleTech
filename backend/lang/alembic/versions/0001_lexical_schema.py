"""lexical schema — words, senses, tags, sense_tags, sense_relations (ADR 064)

Revision ID: 0001
Revises:
Create Date: 2026-06-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# String-valued enums (native_enum=False) → portable across SQLite/Postgres.
_pos = sa.Enum(
    "noun", "verb", "adj", "adv", "pron", "prep", "conj", "det", "interj",
    name="pos", native_enum=False,
)
_level = sa.Enum("a1", "a2", "b1", "b2", "c1", "c2", name="level", native_enum=False)
_register = sa.Enum("formal", "informal", "neutral", name="register", native_enum=False)
_tag_kind = sa.Enum(
    "semantic", "lexical", "context", "domain", "phonetic",
    name="tag_kind", native_enum=False,
)
_relation_type = sa.Enum(
    "antonym", "hypernym", "hyponym", "part_of", "member_of",
    name="relation_type", native_enum=False,
)
_source = sa.Enum("auto", "curated", name="source", native_enum=False)


def upgrade() -> None:
    op.create_table(
        "words",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("lang", sa.String(), nullable=False),
        sa.UniqueConstraint("text", "lang", name="uq_words_text_lang"),
    )

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("kind", _tag_kind, nullable=False),
        sa.UniqueConstraint("name", "kind", name="uq_tags_name_kind"),
    )

    op.create_table(
        "senses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "word_id",
            sa.Integer(),
            sa.ForeignKey("words.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("gloss", sa.String(), nullable=True),
        sa.Column("pos", _pos, nullable=False),
        sa.Column("level", _level, nullable=True),
        sa.Column("register", _register, nullable=True),
        sa.Column("frequency", sa.Integer(), nullable=True),
        sa.Column("lang", sa.String(), nullable=False),
        sa.Column("source", _source, nullable=False),
    )
    op.create_index("ix_senses_word_id", "senses", ["word_id"])
    op.create_index("ix_senses_lang", "senses", ["lang"])

    op.create_table(
        "sense_tags",
        sa.Column(
            "sense_id",
            sa.Integer(),
            sa.ForeignKey("senses.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_sense_tags_tag_sense", "sense_tags", ["tag_id", "sense_id"])

    op.create_table(
        "sense_relations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "from_sense_id",
            sa.Integer(),
            sa.ForeignKey("senses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_sense_id",
            sa.Integer(),
            sa.ForeignKey("senses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", _relation_type, nullable=False),
        sa.Column("source", _source, nullable=False),
    )
    op.create_index("ix_sense_relations_from", "sense_relations", ["from_sense_id"])
    op.create_index("ix_sense_relations_to", "sense_relations", ["to_sense_id"])


def downgrade() -> None:
    op.drop_table("sense_relations")
    op.drop_index("ix_sense_tags_tag_sense", table_name="sense_tags")
    op.drop_table("sense_tags")
    op.drop_index("ix_senses_lang", table_name="senses")
    op.drop_index("ix_senses_word_id", table_name="senses")
    op.drop_table("senses")
    op.drop_table("tags")
    op.drop_table("words")
