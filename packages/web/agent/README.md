# @capsuletech/web-agent

Встраиваемый агент-примитив фронта capsule: LLM-чат + tool-calling + UI. Параметризуется тремя осями (транспорт / тулсет / персона) через subpath-блоки.  ·  zone: **domain**  ·  status: **scaffold (0.0.0)**

Говорит с `backend/scriber` (Rust LLM-роутер capsule) по HTTP+SSE. См. [[035-web-agent-package|ADR 035]].

## Install

```bash
pnpm add @capsuletech/web-agent
# peer deps:
pnpm add solid-js
```

## Minimum usage

> **STATUS: scaffold** — публичный API в процессе. Целевой shape ниже.

```tsx
// apps/<app>/src/widgets/assistant.tsx
import { Agent } from '@capsuletech/web-agent/ui';
import { ConfigurablePersona } from '@capsuletech/web-agent/personas';

export default Widget((Ui) => (
  <Agent.Chat persona={ConfigurablePersona({ name: 'Helper' })} />
));

// apps/<app>/src/features/agent.ts
import type { AgentEvents } from '@capsuletech/web-agent';

export default Feature<AgentEvents>(({ agentApi }) => ({
  initial: 'idle',
  states: {
    idle: {
      onMessage: async ({ payload }) => agentApi.send(payload),
      onToolCall: async ({ payload }) => { /* ... */ },
    },
  },
}));
```

## Subpath exports (3 axes + cross-cutting)

**Транспорт:** `/client` — SSE / WebSocket / polling.
**Тулсет:** `/tools` — tool-registry, native-tools.
**Персона:** `/personas` — system-prompts + поведение.

**Cross-cutting:** `/controllers` (HCA-адаптер) · `/ui` (chat-блоки) · `/capsule` (manifest).

## Docs

- AI-anchor: [`docs/_meta/web-agent.md`](../../../docs/_meta/web-agent.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/domain.md`](../../../docs/_meta/web-zones/domain.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- backend/scriber (Rust LLM-роутер): [`backend/scriber/`](../../../backend/scriber/)
- ADR 035 (web-agent package), ADR 032 (package /controllers + useEmit), ADR 033 (defineCapsuleModule), ADR 047 D2 (no horizontal between domain).
