---
title: README.md Template
status: living
last-updated: 2026-06-11
---

# README.md — шаблон для пакетов `@capsuletech/*`

Каждый пакет в `packages/<scope>/<name>/` имеет `README.md` в своей директории. README — **developer-facing**: открыл папку → за 30 секунд понял что пакет делает + как минимально использовать.

Это **не AI-anchor** (тот — `docs/_meta/<name>.md`, для углублённой архитектуры).
Это **не OWNERSHIP** (тот — `OWNERSHIP.md`, для owner-agent контракта + статуса).

README — **первое что увидит human** (контрибьютор / внешний пользователь). Минимальный, копипаст-готовый, ссылающийся на остальное.

## Канон structure

```markdown
# @capsuletech/<name>

<one-line purpose>  ·  zone: <kit|runtime|domain|boost|studio>  ·  status: <scaffold|alpha|beta|stable>

[Краткий context-блок (опц., 1-3 строки): что отличает от вендора, ключевая фишка.]

## Install

​```bash
pnpm add @capsuletech/<name>
​```

(+ peer deps если есть и не очевидно; например `solid-js`, `@capsuletech/web-style`)

## Minimum usage

​```tsx
// 5-10 строк, копипаст-готово
import { Foo } from '@capsuletech/<name>';

<Foo bar="baz" />
​```

## Subpath exports

(только если у пакета multi-entry build; иначе секцию опустить)

- `/sub-a` — что внутри
- `/sub-b` — что внутри

## Docs

- AI-anchor (architecture): [`docs/_meta/<name>.md`](../../../docs/_meta/<name>.md)
- OWNERSHIP (owner-agent contract): [`./OWNERSHIP.md`](./OWNERSHIP.md)
- (опц.) User guide: [`docs/09-packages/<name>.md`](../../../docs/09-packages/<name>.md)
- (опц.) ADR'ы — конкретные ссылки если пакет рождён из ADR.
```

## Правила

1. **Один README = один пакет.** Не объединять.
2. **Header — обязательно одна строка** с zone + status badge. `zone:` соответствует [[web-zones-index]] mapping'у.
3. **Minimum usage — реально минимальный.** 5-10 строк, копипаст-готово. Не дублировать API-reference (это AI-anchor / docs).
4. **Без emoji** (если user явно не просил).
5. **Без changelog'а в README.** Changelog → `CHANGELOG.md` рядом или в `docs/_meta/<name>.md`.
6. **Без `> Generated with Nx`** boilerplate'а — удалять `nx`-default README'и.
7. **Subpath exports — только если есть multi-entry.** Single-entry пакет секцию опускает.
8. **Docs ссылки — относительные пути** (`../../../docs/_meta/<name>.md`), чтобы работало при клике в GitHub UI.

## Что НЕ должно быть в README

- ❌ Полный API reference (это AI-anchor / `docs/09-packages/<name>.md`).
- ❌ Архитектурные диаграммы (это AI-anchor / ADR).
- ❌ Owner-agent contract (это OWNERSHIP.md).
- ❌ Internal QA notes / TODO (это OWNERSHIP «План рефакторинга»).
- ❌ Storybook URL hardcoded (Storybook может переместиться; ссылка через `docs/09-packages/<name>.md`).
- ❌ Vendor stack развёрнутый (это OWNERSHIP «Vendor stack»). Можно упомянуть key vendor в context-блоке если это разъясняет суть.

## Когда README уже большой

Если у пакета исторически большой README (web-core 600+ строк, web-profiler 100+), **сохраняй существующий контент** — он часто полезен. Но **prepend canon-header** (одна строка с zone + status) + Install + Minimum usage в начало. Большое содержимое после.

Для **новых** пакетов и пакетов с nx-default / 7-строчным README — пиши с нуля по template'у.

## Связанные документы {#related}

- [[OWNERSHIP-template]] — шаблон для OWNERSHIP.md (owner-agent contract + status + vendor stack).
- [[web-zones-index]] — определение `zone:` badge'а.
- [[owner-agent-canon]] — общий канон для owner-* агентов.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D3 — vendor transparency.
