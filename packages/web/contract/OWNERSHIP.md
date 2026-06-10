---
name: "@capsuletech/web-contract"
owner-agent: главный (стюард — протокол/архитектура, без отдельного owner)
group: web_base (планируется; пока standalone git-tag)
status: IMPLEMENTED (0.0.0) — F0 leaf-протокол; компоненты карманят контракты (F1)
last-updated: 2026-06-10
---

# @capsuletech/web-contract

Leaf-протокол контрактов компонентов (zero-dep). **Базовый контракт, без которого кит невалиден.**

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
