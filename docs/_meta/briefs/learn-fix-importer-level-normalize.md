---
title: backend/learn importer — нормализовать level (CEFR заглавными → enum)
status: ready
audience: owner-сессия backend-learn (scope `backend-learn`)
last_updated: 2026-06-28
adr_refs: ["064-A"]
---

# Кто / запуск

Owner `backend/learn` (scope **`backend-learn`**): `.\claude-scope.ps1 -Scope backend-learn`. Read `backend/learn/OWNERSHIP.md`. Commit-only.

# Баг (поймал тестовый датасет учителя)

`SenseIn.level` — enum `Level` (`a1..c2`, строчные). Учитель пишет CEFR в **стандартной нотации заглавными** (`A1`, `B1`...). Импорт падает: `Input should be 'a1'... [input_value='A1']`. Все 6 senses теста зарубились ТОЛЬКО на этом (остальное валидно 6/6).

CEFR конвенционально пишется заглавными — importer должен это принимать (нормализовать), а не требовать строчные. Уже есть прецедент: `_normalize_pos` (`adjective`→`adj`).

# Фикс

В `backend/learn/src/capsule_learn/schemas.py`, класс `SenseIn` — добавить нормализатор `level` (lowercase), по образцу `_normalize_pos`:
```python
@field_validator("level", mode="before")
@classmethod
def _normalize_level(cls, v: object) -> object:
    return v.strip().lower() if isinstance(v, str) else v
```

**Заодно (робастность, рекомендую):** так же нормализовать (lowercase, before) `register_`, `frequency`, `connotation` — чтобы любой регистр enum-полей принимался (учитель может где-то написать `High`/`Positive`). Можно одним валидатором на список полей. tag `kind` / relation `type` — по желанию.

# Acceptance
- `uv run python -m capsule_learn.importer ../../docs/_meta/briefs/learn-vocab-test.yaml` → **imported=6, 0 errors**; повтор → updated=6, 0 дублей.
- Полисемия `bank` → 2 sense; `happy` relations(antonym→sad); `drive` forms(past/participle)+traits; `child` forms(plural=children); `think` phonetic-тег θ — все на месте (curl `/sense/{id}`).
- `uv run pytest` зелёные (добавь кейс: level `A1` импортится как `a1`).
- `uv run ruff check .` clean.

# После
Architect ре-импортит тест-сет начисто + перезапустит :8003 → слова появятся в app'е. Учитель пишет полный датасет (стандартным CEFR, заглавными — теперь принимается).
