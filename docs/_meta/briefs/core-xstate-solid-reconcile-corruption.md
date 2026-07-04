---
title: web-core — ROUND 3 (ФИНАЛ): reconcile-слой @xstate/solid подменяет senses[0] выбранным sense
status: ready
audience: owner-сессия `claude-scope -Scope core` (commit-only, ветка feat/wave-voice-auth-gateway)
last_updated: 2026-07-04
adr_refs: [008, 036]
---

# Фактсет (снят architect'ом в живом браузере, гипотез нет)

Learn, :8080/learn/library/explorer, дерево волны, dist свежие.

1. **Пишется чисто**: на клик тайла через `structuredClone`-перехват проходит РОВНО
   один payload `{selectedId: number}` (sanitisePayload → SET_DATA). Никаких
   объектов sense в update'ах.
2. **Shape/mapper чист**: trace `web-core.shape/item-props` — на клик маппер
   перевызывается и вычисляет selected=true у ПРАВИЛЬНОГО (нового) слова.
3. **Порча в данных, видимых списком**: после выбора элемент `[0]` массива senses,
   ЧИТАЕМОГО через store-прокси (`store.ctx.data.senses` → Shape data → List For),
   СТАНОВИТСЯ выбранным sense-объектом. Замер тремя программными кликами:
   первый тайл показывал happy → also → but (= текущий выбор), остальные 175 целы;
   `data-selected` на двух тайлах (позиция 0 + реальная). mapper calls/клик = 2
   (row0 с НОВЫМ it + реальный row).
4. Порча персистит до перезаписи senses (поиск/reload).

# Вердикт architect

Подмена происходит между XState-актором и Solid-стором — в снапшот-слое
`@xstate/solid` (`useMachine` → `createImmutable`: clone c value-identity
`valueRefs`-дедупом + path-diff/set). Все НАШИ слои (bridge sanitise, Shape,
List, UiProxy) доказаны чистыми (раунды 1-2 + фактсет). NB: это второй дефект
@xstate/solid за сутки (ESM-экспорт в vitest, c29d4696); bridge.ts уже носит
шрам похожего aliasing'а (sanitisePayload).

# Задача

1. **Репро на голом слое**: useMachine (или наш createState+useMachine как в
   web-state) с context `{data:{senses:[{id..},...], selectedId:null}}` →
   SET_DATA {selectedId:N} (число, ключ БЕЗ объектов) → ассерт
   `store.context.data.senses[0]` НЕ подменён. Подобрать форму, дающую репро
   (наша: data-объект пересоздаётся спредом, senses — тот же ref; в context
   рядом components/props/styles от UiProxy-регистраций — возможно, участвуют:
   у зарегистрированных компонентов payload {id} — value-identity clone мог
   сматчить по общим ссылкам/структуре).
2. **Локализовать механизм** в createImmutable (clone valueRefs / diff set path).
3. **Фикс в корне, у нас**: НЕ форк-костыль. Кандидаты: наша обвязка useMachine
   (web-state/web-core createLogicWrapper) перестаёт скармливать reconcile-слою
   форму, вызывающую aliasing (например, дедуп-опасные общие ссылки), ЛИБО
   замена createImmutable на свой явный reconcile с key-контролем в web-state
   (наша зона, ADR 008 — XState единственный движок, но SNAPSHOT-обвязка наша).
   Если окажется апстрим-баг в чистом виде — минимальный воспроизводимый кейс
   в отчёт architect'у (issue апстриму) + наш root-level обход БЕЗ изменения
   контрактов.
4. Регрессионный тест на весь класс: массив объектов в context + селект-ключ
   числом + повторные SET_DATA → ни один элемент массива не подменяется.

# Acceptance

- Репро-тест красный до фикса, зелёный после; прод-цепочка round-2
  (batch-item-props-real-bridge) остаётся зелёной; все тесты web-core/web-state.
- Build пакетов (dist!), biome, typecheck.
- В браузере (проверит user/architect): клик по 3 словам подряд — подсветка
  переезжает, дублей нет, тайл 0 не мутирует.
