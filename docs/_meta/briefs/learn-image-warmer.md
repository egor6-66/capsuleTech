---
title: backend/learn — style-URL картинок + warm_images (бэкфилл и прогрев после импорта)
status: ready ПОСЛЕ image-styles-registry.md (нужен ?style=&subject= контракт)
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [067, 069]
---

# Контекст

Стили появились в image-сервисе (бриф image-styles-registry). learn как
композитор: (1) отдаёт фронту style-URL вместо сырого prompt; (2) владеет
прогревом кэша — eager-генерация «при добавлении слова» = batch-warmer после
импорта, НЕ блокировка импорта. Warmer живёт в learn (знает и lang, и image;
image про lang знать не должен — независимость capability).

# Scope (backend/learn)

1. **`clients/image.py`**: `image_url(subject)` строит
   `{IMAGE_PUBLIC_URL}/image/render?style={IMAGE_STYLE}&subject=…`;
   env `IMAGE_STYLE` (default `word-flat`). Прежний prompt-путь убрать
   (style-URL = единственная форма для слов). Деградация (image down →
   `image: null`) не меняется.
2. **`warm_images` команда** (`python -m capsule_learn.warm_images`, nx-таргет):
   тянет все senses из lang (существующий клиент) → для каждого дёргает
   image `render?style=…&subject=…` (внутренний IMAGE_URL, не public) →
   лог: warmed/cached/failed. Идемпотентна (повтор = сплошные cache-hit).
   Флаги: `--limit N` (пробный прогон), `--dry-run` (только список).
   Sequential, без параллели — GPU одна, не душим.
3. **Тесты** (respx): url-форма style-URL; warmer — happy/skip-cached/
   image-down (failed счётчик, не падение).
4. README: «после импорта слов запускай warm_images» одной строкой
   (позже автоматизируем хвостом vault_import — НЕ в этом брифе).

# Acceptance

pytest+ruff зелёные; live: `warm_images --limit 5` греет 5 слов (лог),
повторный прогон тех же 5 = cache-hit; sense-выдача несёт style-URL;
фронт (:8080/learn/library/explorer) продолжает показывать картинки.

# Что НЕ делаем

- Хранение картинок/URL в БД (канон: производное — в кэш).
- Смену прогрева на параллельный/фоновый демон.
- subject-обогащение образом учителя (sense.image) — придёт отдельно, когда
  поле наполнится контентом.
