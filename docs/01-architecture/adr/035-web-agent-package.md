---
tags: [hca, adr, agent, llm, web-agent, scriber, workspace, proposed]
status: proposed
date: 2026-06-05
last_updated: 2026-06-12
---

# ADR 035 — `@capsuletech/web-agent` + workspace AI-воркеры

> [!note] Status: proposed (2026-06-05)
> Встраиваемый **агент-примитив фронта** `@capsuletech/web-agent`, параметризуемый
> тремя осями (**транспорт / тулсет / персона**) по subpath-блокам. Апп берёт
> нужные блоки и конфигурирует агента под свой кейс: «верстаю UI и молчу»
> (ui-creator), «полный доступ к ПК» (nexus), «ассистент по API» (workspace).
> Говорит с `backend/scriber` (LLM-роутер) по HTTP/SSE. Skeleton-первый,
> наполнение блоков — `owner-web-agent` итеративно.

## Контекст {#context}

Экосистема capsule разрастается; нужен **агент в разных местах с разными
возможностями**:
- `apps/ui-creator` — агент, который верстает UI по запросу/картинке и **больше
  ничего не умеет**;
- `apps/nexus` (desktop) — агент с полным доступом к ПК + возможностью спавнить
  локального/любого другого агента;
- `apps/testhub` (workspace для тестеров/команды) — ассистент, по API (cloud).

Бэкенд уже есть: `backend/scriber` (Rust, axum HTTP/SSE) — провайдер-агностичный
LLM-роутер. `backend/scriber/core/src/types.rs` **уже умеет** ровно нужное:
- per-request `provider` / `model` / `system` (маршрутизация + роль);
- `enable_tools` + `tools: ToolDef[]` + стрим `ChatChunk::ToolCall` — причём
  **сервер не исполняет** client-side tools, а релеит запрос обратно в апп;
- `images: base64[]` + `Capability::Vision` (создание UI по картинке);
- `LlmBackend` trait с заложенными `(P1) OpenAIBackend, AnthropicBackend`.

То есть движок готов; не хватает **фронт-стороны** — упаковки агента, которую
апп встраивает декларативно.

## Среда / ограничения {#constraints}

- **Воркспейс для тестеров/команды — со связью во внешний интернет**, но сервер
  слабый → локальную модель там не крутить → **cloud API** (модель в облаке).
- **Часть апп — закрытый контур** (например `ewc`) → там **локальный Ollama** или
  агента нет. Дефолт фреймворка не хардкодит внешние URL (air-gapped-констрейнт).
- **Cloud-ключи браузер не держит** → для облака всегда **серверный релей** (апп
  ходит в scriber, не в Anthropic/OpenAI напрямую).

## Решения {#decisions}

### 1. Агент — встраиваемый фронт-пакет, параметризуемый тремя осями

«Агент» — не одна сущность, а **тройка (модель + tools + персона)**. На одной
модели можно поднять и ассистента, и узкого воркера — разница в system-prompt и
наборе tools. Три независимые оси:

| Ось | Что задаёт | Блок |
|---|---|---|
| **Транспорт** | где крутится модель (cloud / локальный Ollama) — через scriber | `/client` |
| **Тулсет** | что агент умеет + **где** исполняется tool | `/tools` |
| **Персона** | как себя ведёт (system-prompt + allowlist) | `/personas` |

«Больше ничего не умеет» = апп зарегистрировал ровно нужный набор tools + узкую
персону. **Escape-hatch'а нет** — у агента физически нет других инструментов.

### 2. Структура — subpath-блоки (зеркало `web-ui-creator`)

Логика + UI внутри пакета, нарезаны по entry-точкам (multi-entry `libConfig`);
апп = композиция + конфиг. Берём `@capsuletech/web-ui-creator` как **структурный
ориентир**, не как идеальный эталон (учимся на его шероховатостях).

| Subpath | Роль |
|---|---|
| `/client` | транспорт + agent-loop к scriber (send → стрим → tool-relay → повтор) |
| `/tools` | реестр tools + ToolDef-сериализация + relay-шов |
| `/personas` | декларативные роли |
| `/controllers` | HCA-адаптер `Controllers.Agent` (FSM через `useEmit`, ADR 032) — единственный subpath с `web-core`-зависимостью |
| `/ui` | UI-блоки на `@capsuletech/web-ui` (headless-апп НЕ подключает) |
| `/capsule` | регистрация (ADR 033): `Agent.Panel` + `Controllers.Agent` |

### 3. Шов «где исполняется tool» — главная ось разделения

Контракт scriber уже разводит:
- **client-side tools** (editor-ops `apps/ui-creator`): апп передаёт `ToolDef`-ы,
  модель возвращает `ToolCall`, апп исполняет его **в браузере** против
  `Controllers.Editor` через `useEmit` (ADR 032), дописывает результат. Сервер
  только релеит. **Чистый HCA-стык**: агент — ещё один источник на том же канале,
  что и живой человек.
- **native/server tools** (`apps/nexus`): исполняются **на машине** через scriber
  `ToolProvider` (`capsule-native-tools` / `capsule-mcp`).

Закладываем этот шов в `/tools` явно с первого дня (тут легко наплодить
escape-hatch).

### 4. Транспорт — всегда через scriber (серверный релей для cloud)

`/client` ходит в `backend/scriber` по HTTP/SSE. За scriber'ом — `LlmBackend`:
- **cloud** (workspace) → `AnthropicBackend` (P1, зона owner-scriber); ключ на
  сервере, не в браузере;
- **локально** (air-gapped / nexus) → `OllamaBackend` (есть); vision-модели для
  «UI по картинке» (llava / llama-vision / qwen-vl).

Выбор провайдера/модели/персоны — **внешний конфиг** (цель проекта), не хардкод.

### 5. Owner и границы

- `@capsuletech/web-agent` (фронт) → **owner-web-agent** (новый).
- `backend/scriber` (AnthropicBackend, cloud-routing, native ToolProvider) →
  **owner-scriber** (эскалация через главного).
- editor-ops как `ToolDef` (`@capsuletech/web-ui-creator/controllers`) →
  **owner-web-ui-creator**.
- Встройка в апп (`apps/testhub`, `apps/ui-creator`, `apps/nexus`) → app-зоны.

## Роадмап (итеративно, owner-web-agent)

| Шаг | Что | Зоны |
|---|---|---|
| **0** ✅ | Skeleton: configs + subpath-блоки + пути/exclude (главный, bootstrap) | главный |
| **1** | `/client` — createAgentClient (SSE к scriber) + agent-loop + tool-relay | owner-web-agent |
| **2** | `/tools` — createToolRegistry + ToolDef-сериализация + relay-шов | owner-web-agent |
| **3** | `/personas` — реестр + allowlist-резолв | owner-web-agent |
| **4** | `/controllers` — AgentController (FSM, useEmit) + регистрация | owner-web-agent |
| **5** | `/ui` — чат-панель на web-ui; позже split `/panel` `/composer` | owner-web-agent |
| **6** | `AnthropicBackend` + cloud-routing в scriber | owner-scriber |
| **7** | editor-ops ToolDef в ui-creator → персона `ui-builder` в apps/ui-creator | owner-web-ui-creator + app |
| **→** | nexus `full-access` (native tools), runtime-config | apps + owner-scriber |

Порядок гибкий, согласуется с пользователем по ходу (детали блоков уточняем «делая»).

## Последствия {#consequences}

- ✅ Один **примитив** для всех мест — апп параметризует тремя осями, не пишет
  агента заново. Догфуд + showcase.
- ✅ Движок (scriber) уже готов под tool-relay и провайдеров — фронт ложится сверху.
- ✅ «Больше ничего не умеет» гарантируется ограничением tools, не доверием к модели.
- ✅ Cloud / local / air-gapped — один и тот же фронт-контракт, разница только в
  `LlmBackend` за scriber.
- ⚠️ Cloud требует серверного релея (ключи) — для workspace это есть; для
  air-gapped cloud нет вовсе.
- ⚠️ Шов «где исполняется tool» (client-side vs native) — главный источник
  возможных костылей; закладываем явно в `/tools`.
- ⚠️ Финальный split `/ui` и выбор транспорта (`/client`: сырой SSE vs web-query) —
  открытые решения, согласуются по ходу.

## Открытые вопросы {#open-questions}

- `/client` транспорт: сырой `EventSource`/SSE vs `@capsuletech/web-query` (deps).
- `/ui` split: один блок vs `/panel` + `/composer`.
- Форма tool-relay для native (как `/tools.execute` маршалит в scriber ToolProvider).
- Runtime-config персон/моделей (per-app / per-tester) — пересекается с ADR 025 И7.

## Связанное {#related}

- [[033-package-registration|ADR 033]] — `/capsule` манифест + `defineCapsuleModule`.
- [[032-package-controllers-and-useemit|ADR 032]] — `Controllers.X` + `useEmit` (канал агента = канал человека).
- [[025-testing-hub-and-monitor|ADR 025]] — workspace `apps/testhub`, куда встраивается ассистент.
- `backend/scriber/` — LLM-роутер (зона owner-scriber).
- `docs/_meta/parallel-dev-flow.md` — параллельный флоу разработки.
