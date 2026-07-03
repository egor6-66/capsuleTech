---
title: Foundation 03 — backend/lang/ skeleton (Python FastAPI, plugin-pattern, en_US headliner)
status: superseded # ADR 067 → актуальный бриф backend-lang-extract.md (вынос реального lexical-графа ADR 064 из learn, без mock/capsule-data)
audience: general-purpose agent (commit-only, без push)
last_updated: 2026-06-20
depends_on: [foundation-00, foundation-01]
unlocks: [foundation-04]
adr_refs: [054, 055]
---

# Контекст

ADR 054 D3: `backend/lang/` — Python NLP-движок. Plugin-pattern по языкам. `en_US` headliner на старте; `en_UK`/`ru`/`es`/... — пустые папки с README "coming". API универсальное (язык — параметр), а реализация per-language plugin.

Скелет с mock-эндпоинтами; реальные spaCy/CMUdict/WordNet/Opus-MT — последующие PR.

# Scope

Создать `backend/lang/` со скелетом FastAPI + plugin-loader + `langs/en_US/` stub-реализациями. Endpoints возвращают mock-данные правильного формата.

Работа **напрямую в `main`**. Без ветки. Commit-only **без push**.

# Структура

```
backend/lang/
├── pyproject.toml
├── uv.lock
├── project.json
├── README.md
├── .env.example                    ← LANG_PORT, MODEL_DIR
├── src/
│   └── capsule_lang/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── core/
│       │   ├── __init__.py
│       │   ├── registry.py         ← LangModule registry (load plugins by lang code)
│       │   └── interfaces.py       ← LangModule Protocol (методы pos/phonemes/lookup/...)
│       ├── api/
│       │   ├── __init__.py
│       │   ├── pos.py              ← POST /pos { text, lang } → { tokens }
│       │   ├── phonemes.py         ← POST /phonemes { text, lang } → { ipa, words }
│       │   ├── lookup.py           ← POST /lookup { word, lang } → { definition, ipa, ... }
│       │   ├── idiom.py            ← POST /idiom { text, lang } → { detected }
│       │   ├── translate.py        ← POST /translate { text, from, to } → { translation }
│       │   └── explain.py          ← POST /explain { text, level, lang } → { explanation }
│       ├── models/                 ← pydantic schemas для запросов/ответов
│       │   └── __init__.py
│       ├── langs/
│       │   ├── __init__.py
│       │   ├── en_US/
│       │   │   ├── __init__.py     ← регистрируется в core/registry.py
│       │   │   ├── pos.py          ← stub: возвращает фейковые tokens
│       │   │   ├── phonemes.py     ← stub: один-два IPA-токена per слово
│       │   │   ├── lookup.py       ← stub: возвращает фиксированный dict
│       │   │   ├── idioms.py       ← stub: пустой список
│       │   │   └── slang.py        ← stub: пустой dict
│       │   ├── en_UK/
│       │   │   └── README.md       ← "coming"
│       │   ├── ru/
│       │   │   └── README.md       ← "coming"
│       │   └── es/
│       │       └── README.md       ← "coming"
│       └── services/
│           ├── __init__.py
│           └── translate.py        ← Opus-MT wrapper (mock на старте, stub возвращает [REVERSED] text)
└── tests/
    ├── conftest.py
    ├── test_pos.py
    ├── test_phonemes.py
    ├── test_lookup.py
    ├── test_translate.py
    └── test_registry.py            ← проверяет что en_US plugin зарегистрирован, остальные нет
```

# Контракты эндпоинтов (mock-ответы)

- **POST /pos** `{ text: "He runs fast", lang: "en_US" }` → `{ tokens: [{ word, lemma, pos, tag }] }`.
  Mock: разбить по пробелам, всем `pos: "UNK"`, `tag: "UNK"`, `lemma: word.lower()`.

- **POST /phonemes** `{ text: "hello", lang: "en_US" }` → `{ ipa: "həˈloʊ", words: [{ word: "hello", ipa: "həˈloʊ" }] }`.
  Mock: фиксированный mapping для нескольких слов; для остальных — placeholder `[STUB-IPA]`.

- **POST /lookup** `{ word: "run", lang: "en_US" }` → `{ word, definition, ipa, synonyms: [], frequency: 0.0, examples: [], slang: false }`.
  Mock: hardcoded для пары слов; для остальных — пустые поля.

- **POST /idiom** `{ text: "kick the bucket", lang: "en_US" }` → `{ detected: [{ phrase, meaning }] }`.
  Mock: lookup в hardcoded словаре из 3-5 идиом; пустой массив если не найдено.

- **POST /translate** `{ text, from: "en_US", to: "ru" }` → `{ translation: "[STUB] " + text.reverse() }`.

- **POST /explain** → `{ explanation: "[stub explanation]" }`.

- `GET /health`, `GET /version`, `GET /langs` → `{ available: ["en_US"], coming: ["en_UK", "ru", "es"] }`.

# LangModule контракт

`core/interfaces.py`:

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class LangModule(Protocol):
    code: str  # "en_US"

    def pos(self, text: str) -> list[dict]: ...
    def phonemes(self, text: str) -> dict: ...
    def lookup(self, word: str) -> dict: ...
    def idioms(self, text: str) -> list[dict]: ...
```

`langs/en_US/__init__.py`:

```python
from . import pos, phonemes, lookup, idioms, slang

class EnUSModule:
    code = "en_US"
    # delegate methods to per-feature modules
    pos = staticmethod(pos.run)
    phonemes = staticmethod(phonemes.run)
    lookup = staticmethod(lookup.run)
    idioms = staticmethod(idioms.run)
```

`core/registry.py` — простой dict `{ lang_code → module }`. Bootstrap при старте main.py: `register(EnUSModule())`.

# pyproject.toml / project.json

Аналогично `backend/voice/`. Имя проекта: `capsule-lang`. Default port: **8002**.

# Acceptance

- `nx run capsule-lang:install` — OK.
- `nx run capsule-lang:test:py` — все зелёные.
- `nx run capsule-lang:lint:py` — без ошибок.
- `nx run capsule-lang:serve` — :8002, `/health`/`/langs` отвечают.
- `nx graph` — `capsule-lang` видит `capsule-data-py`.

# Что НЕ делаем

- spaCy / stanza / NLTK / WordNet / CMUdict / Opus-MT — НЕТ на скелете. Stub-реализации.
- en_UK / ru / es — НЕТ. Только пустые папки с README.
- LLM integration (Ollama) — НЕТ.
- БД — НЕТ (lang stateless; capsule-data стоит как dep на будущее).
- Auth, Docker — НЕТ.

# Дальше

После мержа `backend/learn/orchestrator.py` сможет вызывать lang по `LANG_URL` (default `http://localhost:8002`).
