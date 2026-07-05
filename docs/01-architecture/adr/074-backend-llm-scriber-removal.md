---
tags: [adr, accepted, backend, llm, agents, scriber, removal]
status: accepted
date: 2026-07-05
last_updated: 2026-07-05
supersedes: [scriber Rust LLM-роутер (до-ADR-065 архитектура, без номера)]
extends:
  - 065-self-hosted-inference
  - 070-two-tier-deployment-light-vps-gpu-peer
  - 072-user-hosted-nodes-constraints
---

> [!info] Status: accepted
> **`backend/llm`** (:8007) — LLM-capability зеркалом voice/image: pluggable
> движки (llama-cpp in-process, GGUF-локалки 1–4B; fake для CI),
> `/llm/generate` со structured-JSON выводом. Задачи (судья канона, тьютор-
> фидбек, генерация примеров) — промпты у ПОТРЕБИТЕЛЕЙ; полный agent-loop
> (tools, многошаговость) — ADR 065 ф.4-5, ПОВЕРХ, потом. **backend/scriber
> удаляется** (Rust+Ollama = двойное нарушение library-not-service,
> superseded). Через gateway НЕ публикуется (внутренний потребитель).

# ADR 074 — backend/llm (capability) + снос scriber

## Решение {#decision}

### D1 — Capability-слой {#d1}
`backend/llm` (:8007, py3.12/FastAPI/uv — флоу voice/image): реестр движков
(`LlmEngine` Protocol, lazy), `GET /llm/engines`, `POST /llm/generate
{prompt, system?, schema?, max_tokens?, temperature?, engine?}` → текст ЛИБО
валидный JSON по схеме (llama.cpp json-schema/grammar enforcement). Движки
ф.1: `llama-cpp` (GGUF, путь весов env — air-gapped; CPU ok, GPU offload на
3070 Ti), `fake` (детерминированный, CI). Ярус — GPU-peer (ADR 070),
контейнеризуем (ADR 072). Внутренний сервис: gateway-маршрута НЕТ (первые
потребители — бэки: community-судья ADR 073, чекер-LLM-фидбек ADR 069 ф.2+);
публичный фронт-чат появится с agent-loop отдельным решением.

### D2 — Задачи у потребителей {#d2}
Сервис туп (генерация). Judge-промпт — в community; тьютор-фидбек — в learn;
и т.д. Agent-loop (tool-calling, память, многошаговость) — отдельный слой
ПОВЕРХ capability, ADR 065 ф.4-5; `web-agent` (фронт-скелет) дождётся его
контрактов.

### D3 — Снос scriber {#d3}
`backend/scriber/*` (5 крейтов: core/ollama/mcp/native-tools/server)
удаляется: Ollama = внешний сервис (отвергнут ADR 065), Rust-агентная
архитектура superseded слоями D1/D2. Судьбы зависимых:
- **backend/telegram** — ОСТАЁТСЯ (Mini-App/auth-шов независим; chat-
  форвардинг на capsule-server и так не имел живого теста — переподключение
  к /llm при телеграм-волне);
- **backend/fs** — остаётся, если есть живые потребители, иначе уходит со
  scriber (проверка в брифе сноса);
- **apps/agent** (пауза) и **web-agent** — контракты обновятся на /llm+agent-loop.
- root `package.json`: скрипт `dev:backend` (capsule-server) удаляется.

## Последствия {#consequences}
**Плюсы:** один стек бэков (uv/FastAPI), судья почти бесплатен после D1,
инференс-канон 065 доведён (library-not-service). **Цена:** −Rust-зона
scriber (наработки в git-истории); телеграм-чат без бэка до переподключения
(и так не работал из-за сети).
