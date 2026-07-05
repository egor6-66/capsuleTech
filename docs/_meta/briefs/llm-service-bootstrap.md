---
title: backend/llm — LLM-capability (:8007): llama-cpp + fake, /llm/generate со structured-JSON (ADR 074)
status: ready
audience: owner-сессия `./claude-scope.sh backend-llm` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [065, 072, 074]
---

# Контекст

ADR 074: LLM = capability-сервис флоу voice/image (реестр движков, lazy,
opt-in extras, fake для CI). Bootstrap project.json создан (:8007). Сервис
ВНУТРЕННИЙ (gateway-маршрута нет). Первый потребитель — судья канона
(community, ADR 073 ф.C) и LLM-фидбек чекера (потом).

# Scope (backend/llm)

1. **Каркас** — зеркало image (py3.12/FastAPI/uv; ML-грабли УЧТЕНЫ ЗАРАНЕЕ:
   если движок тянет torch — CUDA-индекс пином в pyproject, см.
   image-torch-cuda-index.md; llama-cpp-python обычно без torch — колесо с
   CUDA за extra, CPU-колесо дефолт).
2. **`LlmEngine` Protocol + lazy-реестр**: `generate(prompt, *, system,
   schema, max_tokens, temperature) -> str`; `list_engines()`; default из env.
3. **Движки ф.1:**
   - `llama-cpp` (extra `gen`): GGUF-модель по env `LLM_MODEL_PATH`
     (user-supplied, air-gapped — БЕЗ env движок в списке, generate → 503
     «model not configured»); `schema` → llama.cpp json-schema/grammar
     enforcement (валидный JSON гарантирован движком); n_gpu_layers env
     (default 0 = CPU).
   - `fake`: детерминированный (echo/шаблон; со schema — минимальный валидный
     объект по схеме) — CI без весов.
4. **API**: `GET /health`, `GET /llm/engines`, `POST /llm/generate
   {prompt, system?, schema?, max_tokens?=512, temperature?=0.2, engine?}`
   → `{text}` либо `{json}` при schema. 422 пустой prompt; 400 unknown engine.
5. **Тесты (без весов)**: реестр/дефолт; fake generate детерминирован;
   fake+schema отдаёт валидный по схеме JSON; 503 llama-cpp без env; формы
   ошибок.
6. OWNERSHIP (лицензии моделей — таблица с первого дня: веса выбирает user,
   рекомендации со свободными лицензиями — Qwen2.5/Llama-3.2-класс 1-4B
   указать справочно) + README (команда, как положить GGUF, quirk 127.0.0.1).

# Что НЕ делаем
Agent-loop/tools/память (ADR 065 ф.4-5); judge-промпты (зона community);
gateway-публикацию; скачивание весов в тестах/CI.

# Acceptance
pytest+ruff зелёные (fake-путь); live по возможности: GGUF 1-4B в
LLM_MODEL_PATH → generate отвечает; schema-вывод парсится. Architect после
мержа: CI-матрица +llm.
