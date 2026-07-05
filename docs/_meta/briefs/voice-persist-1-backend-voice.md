# Brief 1/2 — backend/voice: персистентный MinIO-ярус (scope `backend-voice`, commit-only)

**ADR 076.** Достраиваем персист поверх текущего транзитного кэша (in-mem LRU + ETag — уже есть в `api.py`). Curated-озвучка (слова/принятые фразы) = статика → кладём в MinIO раз, отдаём всегда. Динамика — только LRU (без персиста).

## Config (`config.py` + env)
- `MINIO_ENDPOINT` / `MINIO_BUCKET` (`voice`) / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.
- `VOICE_MODEL_VERSION` (str, дефолт `v1`) — в ключ; бамп = перегенерация.
- Клиент: `minio` или `boto3` (S3). Ленивая инициализация; MinIO недоступен → graceful (см. serve).

## Ключ
`voice/<kind>/<engine>/<sha>.wav`, где:
- `kind` ∈ `words` | `phrases` | `dynamic` (query-параметр `kind`, дефолт `dynamic`).
- `sha` = sha256 канонической строки **с версией**: `engine|lang|voice|speed|text|VOICE_MODEL_VERSION` (расширить существующий `_etag`; ETag тоже включает версию — иначе после бампа отдаст старое).

## `/voice/speak` — serve order
1. Если `kind != dynamic` → MinIO `get(key)` → есть? отдать (200, те же ETag/Cache-Control).
2. in-mem LRU (как сейчас).
3. синтез. После: `kind != dynamic` → MinIO `put(key)` **+** LRU; `dynamic` → только LRU.
- **Graceful:** любая ошибка MinIO (down/timeout) → лог `warning`, проваливаемся в LRU+синтез. Хранилище НИКОГДА не даёт 5xx на speak.
- `kind` НЕ входит в ETag (ETag = детерминизм синтеза; kind = политика хранения).

## `POST /voice/warm` (для warm-at-ingest, brief 2)
Body `{ texts: [{text, lang?, voice?, speed?}], engines: [str], kind }`. Для каждой (text×engine): если MinIO-ключ есть → skip (идемпотентно); иначе синтез + put. Возвращает `{ generated, skipped }`. Ошибки одной пары не валят батч.

## Тесты (fake-engine со счётчиком + mock storage)
- MinIO-hit (`kind=words`) → синтез НЕ вызван.
- `kind=dynamic` синтез → MinIO `put` НЕ вызван (только LRU).
- Бамп `VOICE_MODEL_VERSION` → другой ключ/ETag → синтез снова.
- MinIO `get` кидает → graceful синтез, 200 (не 5xx).
- `/voice/warm` идемпотентен (второй прогон skip).

## Acceptance
`uv run pytest` зелёные, `uv run ruff check .` = 0. Фронт/learn не трогаем в этом брифе (audio.url — brief 2).
