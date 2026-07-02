# Brief — owner-studio: починить тесты под свёрнутый-по-старту Accordion

> Запуск: `.\claude-scope.ps1 -Scope studio`. Зона — `packages/web/studio/`. Commit-only.
> Правки в ветку **`feat/studio-creator-tree-iter1`** (PR #456, не смержена). Architect запушит.

## Проблема

`pnpm --filter @capsuletech/web-studio test` — **7 красных** (65 зелёных). Все семь = тесты
дёргают контент, лежащий **внутри свёрнутого `Accordion.Content`**, не раскрыв item:

- `src/styles/__tests__/StylesPanel.test.tsx` — **6 fail**. `StylesPanel` оборачивает toggle +
  reset + список тем в `<Accordion ...>` **без `defaultValue`** → item «Тема канваса» свёрнут →
  Kobalte НЕ монтирует `Accordion.Content` → `querySelector('[data-testid="canvas-theme-*"]')`,
  `[role="switch"]`, `[data-testid="canvas-theme-reset"]` = `null`.
- `src/inspector/__tests__/PropsPanel.test.tsx` — **1 fail** («рендерит поля Inspector для
  выбранного узла»). `Inspector`'овский Accordion теперь тоже свёрнут по старту → поля
  (`input/select/[role=switch]`) не смонтированы → ассерт `hasFields || hasFallback` = false.

**Свёрнутый-по-старту Accordion — это НОРМА (решение USER),** не баг компонента и не регрессия
web-ui (`bordered`/`rounded` — только frame-классы; collapsed-mount — штатное Kobalte-поведение).
Чинить надо **тесты**, а не поведение.

## Что сделать

Обновить оба тест-файла: перед ассертами на контент **раскрыть** соответствующий accordion-item
(симулировать клик по триггеру), затем проверять/кликать вложенные элементы.

Паттерн (jsdom, Solid делегирует click на document → host в DOM):
```
host = document.createElement('div'); document.body.appendChild(host);
const dispose = render(() => <StylesPanel />, host);
// раскрыть item «Тема канваса»
const trigger = host.querySelector<HTMLButtonElement>('button[aria-expanded="false"]'); // или по data-testid/тексту триггера
trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
// теперь Content смонтирован → querySelector на inner-элементы валиден
```
- Раскрытие делать в КАЖДОМ тесте, где ассерт на inner-контент (theme-кнопки, switch, reset,
  Inspector-поля). Тесты, которые уже кликают inner-кнопки (`setTheme`/`setDark`/`reset`), тоже
  требуют предварительного раскрытия — inner-кнопка недоступна пока item свёрнут.
- Если у триггера есть стабильный selector — добавь `data-testid` на `Accordion.Trigger` в
  `StylesPanel.tsx` / рассмотри для Inspector (чтобы тест не ловил триггер эвристикой). Это
  единственная допустимая правка компонента — для тестируемости, не меняя поведение.
- Для PropsPanel: если `Inspector` рендерит несколько категорий — раскрыть нужную (или все).

## Заодно (если по пути)

- `StylesPanel.tsx` doc-шапка говорит «dark-режим виден всегда, не сворачивается», но код кладёт
  toggle внутрь свёрнутого `Accordion.Content` — **привести комментарий в соответствие** с
  актуальным (collapsed) поведением, чтобы док не врал. Поведение НЕ менять.

## Acceptance

- `pnpm --filter @capsuletech/web-studio test` — **все зелёные** (0 fail).
- `nx typecheck @capsuletech/web-studio` — 0. `biome check --write packages/web/studio/src` — чисто.
- Поведение компонентов не изменено (accordions остаются свёрнутыми по старту).

## Границы

- НЕ трогать `@capsuletech/web-ui` (Accordion в порядке).
- НЕ трогать файлы, которые USER редактирует вручную (`info/Info.tsx`, app `creator.tsx`) — если
  твоя правка их не касается напрямую.
- Только тесты + минимальные test-hook правки (`data-testid` на триггер) + doc-комментарий.
