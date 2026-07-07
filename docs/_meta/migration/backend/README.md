# Аудит: backend zone (capability-сервисы)

- **Путь:** `backend/*`
- **Аудит:** 2026-07-08 (pass-1 — раньше не аудировалось; deepen позже как framework)
- **Контекст:** ADR 077 — backend переносится «как готовые контракты, топология ADR 067
  сохраняется». ADR 072 — federation-констрейнты (env-URL / S3 / containerize / outbound).

## Инвентарь

| Сервис | Язык | src | tests | ADR | Роль |
|---|---|---|---|---|---|
| lang | py | 31 | 8 | 055/064/067 | лексическая БД (sense-центрик), vault-import, lessons |
| learn | py | 22 | 9 | 055/067 | learning-сервис (thin app-BFF над lang/voice/image) |
| community | py | 21 | 4 | 071 | соц-ядро (event-журнал, профили, проекции) |
| auth | py | 15 | 2 | 068 | identity (cookie-session v2) |
| voice | py | 12 | 2 | 065/076 | TTS (pluggable движки, media-cache) |
| image | py | 11 | 2 | 069+ | image-gen (sdxl/flux, fake для CI) |
| llm | py | 10 | 2 | 074 | LLM-capability (llama-cpp in-process, structured JSON) |
| telegram | rust | 7 | — | — | gateway/Mini-App (initData HMAC) |
| playground | rust | 7 | — | — | экспериментальный bin |
| target | — | — | — | — | Rust build-output (**N/A**, gitignored) |

**Важно:** все python-сервисы **имеют тесты** (2–9 файлов) — это НЕ testless-скелеты как часть
framework-0.0.0. Backend заметно здоровее по зрелости.

## Federation-posture (ADR 072) — ✅ ЗДОРОВАЯ

- **§1 env-URL, не хардкод.** Соседние ссылки (`community/config.py auth_url`, `learn/config.py
  lang_url/voice_url/image_url`) — **pydantic `BaseSettings` дефолты** (env `LANG_URL`/… override,
  `.env`-файл). `http://localhost:800x` = dev-default, не хардкод-в-коде. **Compliant.**
- Бонус: `learn` держит `voice_public_url`/`image_public_url` для browser-facing ссылок за
  reverse-proxy (single-origin ADR 068-aware) — правильный proxy-split.
- **§3 S3** (MinIO), **§4 containerize**, **§2 X-Internal-Key seam** — по ADR 070/071/072, отдельные
  сервисы поднимаются compose'ом. (Глубокую проверку §2/§3/§4 per-service — в pass-2.)

## Crutch-профиль (sweep `except/type:ignore/noqa/TODO`)

- **Чисто от silent-swallow.** `noqa: F401` в conftest/alembic = намеренно (register tables) —
  стандарт SQLAlchemy.
- **voice** `api.py`/`storage.py`: `except Exception as exc: # noqa: BLE001` ×несколько —
  **аннотированы причиной** («degrade to LRU + synthesis», «persist best-effort», «never raise to
  caller»). Это ADR 076 media-cache graceful-degradation. Логируют `exc`, деградируют намеренно —
  **не silent-swallow.** Ок.
- **lang** `lessons_importer.py` — **40+ `# type: ignore[attr-defined]`** в ОДНОМ файле (доступ
  `.id/.dimension/.items/…` на pydantic-моделях, которые чекер не резолвит). Не гниль (работает,
  тесты есть), но **typing-долг-хотспот**. v2: улучшить типизацию моделей (discriminated unions)
  или вынести dispatch. Единственный заметный typing-smell бэка.

## Тиры (pass-1)

**🟢 READY (перенос как контракт, ADR 067):**
- **learn** — лучший test-ratio (9/22), config federation-эталон, thin-BFF паттерн чист.
- **lang** — core, substantial+tested (8/31); **NB** importer typing-долг (не блокер, чистим при переносе).
- **community** — соц-ядро, event-журнал append-only, 4/21.

**🟡 FIX-FIRST (тест-глубина):**
- **auth** (2/15), **image** (2/11), **llm** (2/10), **voice** (2/12) — код по ADR-канону
  (capability-паттерн, pluggable движки, structured output), но **тесты тонковаты** (2 файла).
  Поднять покрытие ДО объявления эталоном. voice дополнительно — media-cache best-effort уже tested-паттерн.

**🟠 UNDER-QUESTION (Rust-вес / experimental):**
- **telegram** (rust) — gateway/Mini-App живой, но **Rust-вес** (как desktop: cargo-toolchain,
  platform-бинарь). Проверить живой e2e (chat-форвардинг был мёртв после сноса scriber, ADR 074 D3).
  Отдельный ship-юнit (`integrations/`, repo-map).
- **playground** (rust) — экспериментальный bin. **Defer** (не продукт).
- **target** — build-output, **N/A** (не мигрирует).

## Первая волна backend
`learn`+`lang`+`community` (🟢) + добор тестов на `auth`/`image`/`llm`/`voice` (🟡) = capability-ядро.
Rust (telegram) — отдельным треком (integrations); playground/target — не переносим.

## Pass-2 (2026-07-08) — ADR 072 §2/§4 проверены

- **§4 containerize — ❌ НЕ ВЫПОЛНЕН (packaging-долг).** Glob `Dockerfile*` по `backend/`: **ноль**
  своих Dockerfile'ов (совпадения только в `voice/.venv/` = сторонние пакеты). Compose только у
  `playground` (rust experimental). **Python-сервисы крутятся на хосте (`uv run uvicorn`), не в
  контейнерах.** ADR 072 §4 («каждый бэк-сервис контейнеризуем с первого дня») — **аспирационен,
  не достигнут** (известный долг, checkpoint «Dockerize-брифы»). v2 self-host/federation упирается
  в это → Dockerfile per-сервис = обязательный шаг переноса (env-конфиг у них уже есть — pydantic
  Settings, так что контейнеризация механическая).
- **§2 X-Internal-Key seam — ✅ ЕСТЬ (где нужно).** `community` реализует заменяемый auth-шов:
  `internal_key` (env-setting) + `require_internal_key` FastAPI-Depends на `/internal/events`,
  **не публикуется через gateway** (ADR 071 D4), **покрыт тестами** (`test_events_api.py`: wrong-key
  403, no-key-configured behavior). Контракт эндпоинта не завязан на механизм → замена на node-scoped
  ключи/mTLS не ломает форму (ADR 072 §2 ✓). Только community держит internal-only эндпоинты; прочим
  сервисам §2-шов пока не нужен.
- **§3 S3** — voice (media-cache ADR 076) + community (media ADR 071 D5) ходят в MinIO по S3;
  диск не контракт (ADR 072 §3 ✓, spot-verify; полный per-service S3-скан — при переносе).

## Открыто (pass-2 остаток)
- lang importer typing-долг (40+ `type: ignore`) — оценить объём чистки (discriminated unions).
- telegram живой e2e (после ADR 074 D3 chat-форвардинг был мёртв).
- `voice`/`image`/`llm` — real-engine пути за env-флагами (CI гоняет fake) — эталонность real-путей.
- Dockerfile per python-сервис (§4 долг) — механический, но обязательный для v2.
