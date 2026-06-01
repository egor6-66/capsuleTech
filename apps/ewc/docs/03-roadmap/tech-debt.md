<a id="top"></a>

# 🧹 Технический долг

> 🏠 [Хаб документации](../README.md) › 🗺️ [Дорожная карта](README.md) › **Технический долг**

> **Аудитория:** 🛠️ Разработчик · 🤖 Агент
> **Статус:** 🟡 Учтено, не закрыто

Временные решения, заглушки и упрощения, сознательно оставленные на этапе Demo. Это **не баги** (те — в [Известных проблемах](known-issues.md)), а места, которые надо закрыть перед боевым запуском.

---

## Содержание

| Раздел | Для кого |
|---|---|
| [Временные решения](#временные-решения) | 🛠️ · 📊 |
| [Заглушки UI](#заглушки-ui) | 🛠️ |
| [Типизация](#типизация) | 🛠️ · 🤖 |
| [Критические места — не сломай](#критические-места--не-сломай) | 🤖 · 🛠️ |

---

## Временные решения

| 🧪 Что | Где | Чем заменить |
|---|---|---|
| Данные — моки (200 сидированных карточек) | [`entities/incident.tsx`](../../src/entities/incident.tsx), [`endpoints/incidents.ts`](../../src/endpoints/incidents.ts) | Реальный `api.incidents.list()` — Phase 2 |
| Авторизация — mock-креды `user`/`123`, токен в `localStorage` | [`features/auth.tsx`](../../src/features/auth.tsx), [`endpoints/auth.ts`](../../src/endpoints/auth.ts) | Реальный JWT + refresh — [Бэклог платформы](backlog/platform.md) |
| Нет защиты маршрутов — `/workspace` открыт без входа | роутер | Route guard по токену — [Бэклог платформы](backlog/platform.md) |
| `/register` — форма без бэкенда | [`widgets/forms/auth/register.tsx`](../../src/widgets/forms/auth/register.tsx) | Реальный эндпоинт регистрации |
| `/workspace/reports` — placeholder | [`pages/workspace/reports/index.tsx`](../../src/pages/workspace/reports/index.tsx) | Реальная отчётная зона |
| Карточка происшествия — read-only (`mode="static"`) | [`pages/workspace/cards/[id]/index.tsx`](../../src/pages/workspace/cards/[id]/index.tsx) | Controlled-режим + сохранение — [Бэклог платформы](backlog/platform.md) |

## Заглушки UI

В `@capsuletech/web-ui` пока нет части примитивов — в [карточке происшествия](../01-features/incident-card.md#заглушки) они заменены ближайшими:

| Нужен | Заглушка | Зона фикса |
|---|---|---|
| `select` | `ui.Input` readonly | 🏗️ `owner-web-ui` |
| `textarea` | высокий `ui.Input` | 🏗️ `owner-web-ui` |
| `checkbox` | `ui.Toggle` | 🏗️ `owner-web-ui` |
| `audio`-плеер | `ui.Typography` | 🏗️ `owner-web-ui` |
| Иконки, маски ввода (`+7`) | опущены | 🏗️ / app |

> [!NOTE]
> Недостающие примитивы — **зона фреймворка**. EWC их потребитель: появятся в `web-ui` → заменяем заглушки в схеме карточки.

## Типизация

Места, где пришлось обойти типы кастами — кандидаты на фикс типизации (часть — в зоне `web-core`):

| 🔧 Каст | Где | Почему |
|---|---|---|
| `store.ctx.data as IIncidentsContext \| undefined` | [`widgets/maps/world.tsx`](../../src/widgets/maps/world.tsx), [`widgets/tables/incidents.tsx`](../../src/widgets/tables/incidents.tsx), settings-views | Стор Feature не типизирован дженериком по data-shape — 🏗️ `web-core` |
| `(target as { meta?: { tags?: string[] } })` | [`features/incidents.ts`](../../src/features/incidents.ts) | `target` в хэндлере типизирован широко — 🏗️ `web-core` |
| `{ ui: Ui } as unknown as Registry` | [`pages/workspace/cards/[id]/index.tsx`](../../src/pages/workspace/cards/[id]/index.tsx) | Проксированный `Ui` не совпадает по типу с `Registry` рендерера — 🏗️ `web-renderer` |

> [!TIP]
> Эти касты безопасны в рантайме (shape совпадает), но скрывают ошибки при рефакторинге. Перед Phase 2 стоит свести их к нулю — частью усилиями app-команды, частью эскалацией во фреймворк.

## Критические места — не сломай

🤖 _Для агентов и разработчиков: вещи, которые выглядят «странно», но сделаны намеренно. Не «упрощай»._

| 🚨 Место | Почему так | Что будет, если «починить» |
|---|---|---|
| `structuredClone(unwrap(item))` в `onClick` | [`features/incidents.ts:98`](../../src/features/incidents.ts#L98) — кладём **глубокую копию**, а не живой узел стора `items[k]` | Положишь живой узел в `selected` → `@xstate/solid` сошьёт их в один прокси при reconcile → следующий выбор испортит `items[k]` |
| `infinite: { mode: 'plain' }` | таблица намеренно non-virtual | Вернёшь `virtual` → пустая таблица на cold reload ([баг](known-issues.md#виртуальный-скролл-таблицы)) |
| `selectionSource !== 'table'/'map'` гейты | [`world.tsx`](../../src/widgets/maps/world.tsx), [`incidents.tsx`](../../src/widgets/tables/incidents.tsx) | Уберёшь гейт → виджет среагирует на собственный клик, интерфейс «задёргается» |
| Page-transition через свою либу, не локальный FadeIn | [`pages/workspace/index.tsx`](../../src/pages/workspace/index.tsx) | Локальный `<For>`+opacity уже откатывали — не работает с Presence |
| `layoutMode="view"` на workspace-shell | [`pages/workspace/index.tsx`](../../src/pages/workspace/index.tsx) | Снимешь → каркас (header) станет таскаемым/ресайзимым |

---

## Связанное

- ⚠️ Активные баги (не долг) — [Известные проблемы](known-issues.md).
- 💡 Превращение долга в задачи с оценками — [Бэклог](backlog/README.md).
- 📊 Как долг влияет на сроки фич — [Матрица для менеджеров](../04-for-managers/cost-matrix.md).

---

> ⬅️ [Известные проблемы](known-issues.md) · [Бэклог](backlog/README.md) ➡️
> 🏠 [К хабу документации](../README.md) · ⬆️ [Наверх](#top)
