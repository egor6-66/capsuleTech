---
title: backend/image — capability-сервис генерации картинок (:8005), зеркало voice
status: ready
audience: owner-сессия `claude-scope -Scope backend-image` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [054, 065, 067]
---

# Контекст

Генерация картинок для слов (word-as-image учителя) = новый capability-сервис
по ADR 067, **зеркало backend/voice 1-в-1**: pluggable движки, реестр,
`?engine=`, disk-кэш, публичный контракт. Bootstrap `backend/image/project.json`
уже создан architect'ом (scope `backend-image`). Gateway уже маршрутизирует
`/api/image/<rest>` → `:8005/image/<rest>`.

**Канон ADR 065:** library-not-service (diffusers/torch in-process — ок; внешние
image-API — нет, это отдельные будущие движки по решению user); air-gapped —
никаких хардкод-URL, model-id/пути весов конфигом.

# Scope

`backend/image/` — FastAPI + uv (py 3.12, стек ADR 067; ВНИМАТЕЛЬНО: если
diffusers/torch на 3.12 упрутся в колёса — py 3.11 как у voice, зафиксировать
в OWNERSHIP почему):

1. **Каркас** (зеркалить voice по структуре): `pyproject.toml` (torch/diffusers =
   opt-in extra `gen`, чтобы CI ставил только лёгкое ядро), `src/capsule_image/`
   {main, config, api, engine, engines/}, tests, OWNERSHIP.md, README.
2. **`ImageEngine`-контракт + реестр** (зеркало voice `engine.py`):
   `generate(prompt, *, size, seed) -> bytes(PNG)`; `list_engines()`; default из
   settings (`IMAGE_ENGINE`).
3. **Движки фазы 1:**
   - `sdxl-turbo` (diffusers, 1-4 шага; лицензия OpenRAIL++ — ок) — baseline,
     работает на скромном GPU;
   - `flux-schnell` (Apache 2.0) — за отдельным extra, НЕ дефолт (VRAM ~12ГБ+;
     VRAM машины user'а неизвестен);
   - `fake` — детерминированный тестовый движок для CI (1×1 PNG из seed),
     как voice тестирует без весов.
   - ❌ FLUX.1-dev НЕ брать — non-commercial (класс отклонённого f5, ADR 065).
4. **API:**
   - `GET /image/engines` → `{ engines: [...], default }` (форма = voice, фронт-свичер);
   - `GET /image/render?prompt=&engine=&size=&seed=` → `image/png` +
     **disk-кэш** по sha256(engine|prompt|size|seed) + ETag (зеркало
     voice speak-cache). Генерация дорогая — кэш обязателен с первого дня.
   - `GET /health`.
5. **Тесты (без весов!):** реестр/дефолт, engines-контракт, render с fake-движком
   (кэш-hit/miss, ETag, детерминизм по seed), 422 на пустой prompt.
6. **OWNERSHIP.md:** лицензии движков таблицей СРАЗУ (урок voice: edge/f5
   доехали без лицензионного гейта).

# Что НЕ делаем

- Интеграцию в learn-выдачу (отдельный бриф backend-learn) и фронт-свичер
  (бриф apps) — только сервис.
- Внешние image-API (MJ/Stability/…) — отложены user'ом.
- CI-матрицу не трогать — architect добавит `image` после первого зелёного pytest.

# Acceptance

- `uv run pytest` зелёные (fake-движок, БЕЗ скачивания весов).
- `uv run ruff check .` чист.
- Live-smoke с реальным движком (sdxl-turbo) — по возможности железа; если веса
  не влезли/нет GPU — честно зафиксировать в OWNERSHIP, fake-движок остаётся
  контрактным гарантом.
- Quirk: curl'ить 127.0.0.1, не localhost (::1-грабля).
