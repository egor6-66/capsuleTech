---
name: "@capsuletech/web-contract"
owner-agent: главный (стюардит главный assistant — протокол/архитектура)
group: web_base
zone: runtime
status: alpha
priority: P1
last-updated: 2026-06-11
---

# @capsuletech/web-contract

Leaf-протокол контрактов компонентов (zero-dep). **Базовый контракт, без которого кит невалиден.** Также — место для cross-domain capability контрактов per [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D2 (no horizontal between domain).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — leaf-протокол контрактов компонентов (zero-dep) + cross-domain capability контракты (ADR 047 D2).
- **Status:** `alpha` (0.0.0) — F0 leaf-протокол implemented; компоненты карманят контракты (F1 в процессе).
- **Priority:** **P1** — основа vendor-transparent architecture + cross-domain (ADR 047 D2).
- **Maturity bar (до beta):**
  - Component contracts (props/variants/styleSlots/data/events) для всех web-ui primitives.
  - Capability contracts (IAuthCapability / IShellCapability) для cross-domain.
  - `collectContracts` API для web-creator.
- **Active blockers:** нет.
- **Roadmap:**
  1. F1 — компоненты web-ui карманят контракты.
  2. Cross-domain capabilities (IAuthCapability и т.д.) — Phase D2.
  3. `collectContracts` API.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — для JSX types.

Leaf-пакет zone runtime. Zero non-Solid deps по дизайну.

## Зачем

Компонент САМ описывает, что умеет и как с ним обращаться (props/variants/styleSlots/data/events + accepts-children). Редакторы (`web-creator`), demo-стенд, тесты, доки — ПОТРЕБИТЕЛИ. Тип контракта живёт в leaf, потому что web-ui (продьюсер) **ниже** web-creator (потребитель) → класть тип в creator = цикл.

## Контракт = композиция rule-примитивов

`defineContract([ rule.isLeaf(), rule.props(schema), rule.variants([...]), rule.styleSlots([...]), rule.data(shape), rule.events([...]), rule.recommend(pred, hint) ])`. Две жёсткости (constraint/recommendation), два типа (реляционные/собственные), вложенность — parent-side `accepts` (single source).

## Границы

- **Стюард — главный.** Это протокол/архитектура (критический путь), без отдельного owner-агента.
- Архитектурные правила (import-граф слоёв) → остаются в `compliance` (другая ось). Общее rule-ядро `@capsuletech/rules` — НАМЕРЕНИЕ, выделять ПОСЛЕ эталона.
- zero-dep leaf: никакого AST/browser-специфичного кода (его импортит и Node-compliance в будущем).

## Старт (F0)

ОДИН rule (`accepts`/`isLeaf`) на Button → редактор реагирует → доводим до эталона → дальше правила по одному (плагины).

## Документация

- Спека: `docs/playground/contracts.md`
- Роадмап/фундамент: `docs/playground/roadmap.md` (F0)
