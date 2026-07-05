# Brief 2/2 — backend/learn: warm-at-ingest + audio.url с kind (scope `backend-learn`, commit-only)

**ADR 076.** learn = композитор; прогревает voice-кэш для curated-контента и отдаёт выводимый `audio.url` (зеркало `image.url`). Ждёт brief 1 (`/voice/warm` + `kind`).

## audio.url — добавить `kind`
Там где learn собирает `audio.url` на voice — включить `kind` (+ resolved `engine`):
- озвучка слова/sense → `kind=words`;
- озвучка принятой фразы/примера → `kind=phrases`.
Формат: `<voice-base>/voice/speak?engine=<eng>&kind=words&text=<...>` (relative `/api/voice/...` через gateway, ADR 068 single-origin — НЕ хардкод порта). Динамика (если есть в learn) → `kind` не задаём (дефолт `dynamic`, не персистится).

## Warm-at-ingest
При появлении/принятии curated-контента прогреть 3 движка:
- Источник контента — lang (senses) + принятые фразы. learn уже ходит в lang по httpx.
- Реализация: warm-шаг/команда `POST /voice/warm` с `texts` (тексты слов/фраз), `engines` = все зарегистрированные (из `/voice/engines`), `kind` соответствующий. Идемпотентно (brief 1 skip-if-exists).
- Триггер: на прогон importer'а / обновление контента (может быть отдельная команда `warm-voice`, вызываемая после импорта). НЕ на старте аппа — на изменение контента (словарь растёт).
- Ошибки warm НЕ валят основной flow (best-effort прогрев; speak всё равно синтезнёт по требованию).

## Федерация (ADR 072)
warm гоняется на ноде self-hoster'а против ЕГО lang + voice + MinIO. Контракт (kind-схема + `/voice/warm` + audio.url) — единственное, что шиппим; данные/железо — его.

## Тесты
- `audio.url` для слова содержит `kind=words` + resolved engine.
- warm вызывает `/voice/warm` с полным списком engines, kind корректный; повторный прогон — voice скипает (мок voice-клиента со счётчиком).
- warm-ошибка voice → основной composer-flow не падает.

## Acceptance
`uv run pytest` зелёные, `uv run ruff check .` = 0. Живой чек (user): добавить слово → warm → повторный 🔊 в логах voice БЕЗ синтеза (из MinIO); рестарт voice — озвучка живёт (персист).
