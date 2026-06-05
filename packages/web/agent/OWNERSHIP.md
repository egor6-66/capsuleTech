# OWNERSHIP — @capsuletech/web-agent

**Owner agent:** `owner-web-agent`
**Package path:** `packages/web/agent/`
**Release group:** `web_base` (tag `web@{version}`)
**Status:** `0.0.0` — skeleton (контракты + TODO). Наполнение блоков — owner.
**ADR:** [[035-web-agent-package|ADR 035]] (web-agent package + workspace AI)

## Зона ответственности

Встраиваемый **агент-примитив фронта**: апп берёт блоки по subpath'ам и
параметризует тремя осями — **транспорт / тулсет / персона**. Логика + UI внутри
пакета, нарезаны по entry-точкам; апп = композиция + конфиг.

Агент говорит с бэкендом `backend/scriber` (LLM-роутер, axum HTTP/SSE) — за ним
`LlmBackend` (Ollama / Anthropic / …) и `ToolProvider` (native / MCP). **Контракт
scriber править НЕ здесь** — это зона `owner-scriber` (эскалация через главного):
новый провайдер (AnthropicBackend), cloud-routing, native ToolProvider.

## Три оси (архитектурное правило)

| Ось | Блок | Что задаёт |
|---|---|---|
| **Транспорт** | `/client` | где крутится модель (cloud API / локальный Ollama) — через scriber |
| **Тулсет** | `/tools` | что агент умеет; **место исполнения** tool'а: client-side vs релей в native |
| **Персона** | `/personas` | как себя ведёт: system-prompt + allowlist tools |

«Агент больше ничего не умеет» = апп зарегистрировал ровно нужный набор tools +
узкая персона. **Нет escape-hatch** — у агента физически нет других инструментов.

## Публичный API (subpaths)

| Subpath | Статус | Что |
|---|---|---|
| `.` | stub | barrel логических блоков (client + tools + personas) |
| `/client` | stub | `IAgentClientConfig`, `IAgentClient`, `createAgentClient` (throw-заглушка). Транспорт + agent-loop к scriber |
| `/tools` | stub | `IAgentTool`, `defineAgentTool`. Реестр + ToolDef-сериализация + relay-шов |
| `/personas` | stub | `IAgentPersona`, `defineAgentPersona`. Декларативные роли |
| `/controllers` | empty | `Controllers.Agent` FSM через `useEmit` (ADR 032). Единственный subpath с `web-core`-зависимостью |
| `/ui` | empty | UI-блоки на `@capsuletech/web-ui` (чат-панель, композер…). Headless-апп НЕ подключает |
| `/capsule` | stub | `defineCapsuleModule({ name: 'Agent', … })` (ADR 033). components/controllers — TODO |

## Места встройки (для контекста; апп-зоны — не owner'а)

- **apps/testhub** (workspace) — главный/app-зона. Чат-поверхность, говорит с scriber.
- **apps/ui-creator** — `ui-builder` персона: tools = editor-ops из
  `@capsuletech/web-ui-creator/controllers` (зона `owner-web-ui-creator`), дёргает
  `Controllers.Editor` тем же `useEmit`, что человек.
- **apps/nexus** (desktop) — `full-access` персона: native FS + spawn-agent (scriber).

## Известные ограничения / quirks

1. **Multi-entry vite build** — все subpaths обязаны присутствовать в dist
   (зеркало web-ui-creator). `/controllers` и `/ui` сейчас пустые → возможны
   warning'и «empty chunk» при build, это ОК для skeleton.
2. **`/ui` тянет UI-зависимости** — не импортировать в headless/prod-bundle без UI.
3. **`/controllers` зависит на `web-core`** — остальные блоки framework-agnostic.
4. **Транспорт (cloud) всегда через серверный релей** — браузер не держит API-ключ.
   `/client` ходит в scriber, не в Anthropic/OpenAI напрямую.
5. **SSE-парсер — в web-query, не в web-agent** — `sse-parser.ts` удалён из
   `/client`. Парсинг кадров делегируется в `@capsuletech/web-query/stream`
   (см. `packages/web/query/src/stream/sse-parser.ts`). Тесты парсера
   (`sse-parser.test.ts`) тоже удалены — они теперь зона web-query.
6. **PENDING(scriber): `continueWithToolResults`** — multi-turn tool-feedback
   требует `messages[]` в `POST /chat/stream`. Пока не реализовано: ждём
   расширения контракта scriber (эскалация через главного к owner-scriber).

## Открытые решения (согласовать с главным по ходу)

- ~~Транспорт `/client`: сырой SSE vs `@capsuletech/web-query`~~ — **закрыто**:
  транспорт = `streamSse` из `@capsuletech/web-query/stream` (импорт по subpath,
  tree-shake, иерархия ошибок web-query, bases-резолв).
- Финальный split `/ui` (один блок vs `/panel` + `/composer`).
- Форма tool-relay для native (как `/tools.execute` маршалит в scriber ToolProvider).

## Тест-покрытие

Пока нет (skeleton). Owner добавляет при наполнении блоков:
- `client/__tests__` — agent-loop, tool-call relay-цикл, стрим-парсинг.
- `tools/__tests__` — registry, allowlist-фильтр по персоне, ToolDef-сериализация.

## Roadmap

- [x] Skeleton: configs + subpath-блоки + регистрация путей/exclude (главный, bootstrap)
- [x] `/client` — createAgentClient (SSE к scriber) + agent-loop + mock-транспорт
  - Транспорт: `streamSse` из `@capsuletech/web-query/stream` (dep добавлен)
  - SSE-парсер удалён из web-agent (живёт в web-query)
  - `continueWithToolResults` — PENDING(scriber)
- [x] `/tools` — createToolRegistry + ToolDef-сериализация + allowlist-фильтр
- [ ] `/personas` — реестр + allowlist-резолв
- [ ] `/controllers` — AgentController (FSM, useEmit) + регистрация в capsule.ts
- [ ] `/ui` — чат-панель на web-ui + (позже) split на /panel /composer
- [ ] `docs/_meta/web-agent.md` AI-anchor
