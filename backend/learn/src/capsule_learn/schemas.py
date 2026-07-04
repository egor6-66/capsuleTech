"""Learn's own response models — lang shapes + audio enrichment (ADR 067 D2).

Deliberate copies of lang's response forms: the composer owns its front
contract and never imports another service's models. Former enum facets are
plain strings here — the lexical taxonomy lives in lang; learn passes values
through without re-validating them.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AudioBlock(BaseModel):
    """Ready-to-play voice link + available engines — never audio bytes."""

    url: str
    engines: list[str]


class ImageBlock(BaseModel):
    """Ready-to-display image link — never image bytes.

    Supersedes the former plain-text `image` ("образ") mnemonic on the sense:
    lang carries a text stand-in until picture generation exists, at which
    point the composer replaces it with this link.
    """

    url: str


class ResolvedWord(BaseModel):
    """A drill word resolved to its lang sense + media (library-style enrichment).

    Injected as `words_resolved[]` on each lesson drill (ADR 069 ф.1). When the
    word isn't in lang yet, `senseId`/`ru`/`pron_ru`/`pos` stay `None`; `audio`
    rides on the text alone (voice up), `image` needs the resolved `pos`.
    """

    text: str
    senseId: int | None
    ru: str | None
    pron_ru: str | None
    pos: str | None
    audio: AudioBlock | None
    image: ImageBlock | None


class TagOut(BaseModel):
    name: str
    kind: str


class ExampleOut(BaseModel):
    text: str
    pron_ru: str | None = None
    ru: str | None = None
    ipa: str | None = None


class RelationOut(BaseModel):
    type: str
    target: str  # "word" or "word (gloss)" of the resolved sense


class WordOut(BaseModel):
    text: str
    lang: str


class SenseListItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    ru: str | None
    pos: str
    level: str | None
    # `register_` avoids shadowing BaseModel; JSON key stays "register".
    register_: str | None = Field(alias="register")
    frequency: str | None
    pron_ru: str | None
    connotation: str | None
    synset: str | None
    tags: list[TagOut]
    audio: AudioBlock | None
    image: ImageBlock | None


class SensesResponse(BaseModel):
    senses: list[SenseListItem]


class SenseDetail(BaseModel):
    id: int
    word: WordOut
    gloss: str | None
    ru: str | None
    pos: str
    level: str | None
    register_: str | None = Field(alias="register")
    frequency: str | None
    source: str
    pron_ru: str | None
    ipa: str | None
    connotation: str | None
    intensity: int | None
    synset: str | None
    nuance: str | None
    valency: str | None
    forms: dict[str, str]
    collocations: list[str]
    tags: list[TagOut]
    examples: list[ExampleOut]
    relations: list[RelationOut]
    audio: AudioBlock | None
    image: ImageBlock | None


class RelatedItem(BaseModel):
    id: int
    text: str
    gloss: str | None
    sharedTags: int
    sameSynset: bool
    connotation: str | None
    intensity: int | None
    synset: str | None
    tags: list[TagOut]


class RelatedResponse(BaseModel):
    related: list[RelatedItem]
