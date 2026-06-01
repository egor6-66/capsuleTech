<a id="top"></a>

# 📖 Словарь

> 🏠 [Хаб документации](../README.md) › 🗺️ [Обзор](README.md) › **Словарь**

> **Аудитория:** 🛠️ Все читатели
> **Статус:** ✅ Актуально

Термины, которые встречаются по всей документации EWC. Доменные (про инциденты) и технические (про фреймворк).

---

## Домен

| Термин | Что значит |
|---|---|
| **Инцидент / Происшествие** | Карточка обращения: заявитель, координаты, описание, время. Базовая сущность EWC ([`entities/incident.tsx`](../../src/entities/incident.tsx)). |
| **Заявитель** | Человек, который обратился. У карточки есть `applicant.name` и `applicant.phone`. |
| **Выбранный инцидент** | Карточка, по которой кликнули. Хранится в сторе как `selected` и подсвечивается во всех виджетах. |

## Фреймворк (HCA / Capsule)

| Термин | Что значит |
|---|---|
| **HCA** | _Hyper-Controlled Architecture_ — архитектура Capsule. Вся власть в логике, UI — немая проекция. |
| **Стор** | Реактивное состояние Feature. Виджеты читают через `store.ctx.data.X`, мутируют через `store.update({...})`. |
| **Стор как протокол** | Виджеты общаются не напрямую, а через общий стор. Мутация = синхронизация. См. [Архитектура](architecture.md#стор-как-протокол). |
| **meta-тег** | Метка на JSX-узле (`meta={{ tags: [...] }}`). По ней `onClick`-роутер фичи понимает, что делать. UI не несёт колбэков. |
| **payload** | Данные, прикреплённые к кликабельному элементу (`payload={{ id }}`) — например, id инцидента. |
| **onClick-роутер** | Один обработчик в Feature, который ловит все клики и роутит по `target.meta.tags`. См. [`features/incidents.ts`](../../src/features/incidents.ts). |
| **Feature** | Слой доменной логики: API, side effects, FSM. Единственное место для сетевых вызовов. |
| **Widget** | Композиция: склеивает View/Shape с Feature. Единственное место, где «склейка» разрешена. |
| **View** | Stateless-кусок UI в JSX. Без состояния, без API. |
| **Shape** | Описание, **как нарисовать** сущность batch-шаблоном (таблица, список, превью). |
| **Entity** | Доменная схема (zod) + дефолты. Без UI. |
| **UiProxy** | Механика web-core: оборачивает UI-kit, перехватывает события у элементов с `meta`. |
| **Matrix** | Layout-компонент (`Ui.Layout.Matrix`) со слотами `header/main/rightBar/footer`. Несёт DnD и ресайз. |
| **swapGroup** | Группа слотов Matrix, внутри которой виджеты можно менять местами перетаскиванием. |
| **layoutMode** | Режим раскладки: `view` (заблокировано) / edit (можно тащить/ресайзить). Глобальный тумблер. |
| **settings-strip** | Полоска настроек виджета, появляется в режиме «Widget settings». Несёт тумблеры синхронизации. |

## Внешние пакеты Capsule в EWC

| Пакет | Зачем в EWC |
|---|---|
| `@capsuletech/web-core` | Wrapper'ы слоёв, UiProxy, lifecycle |
| `@capsuletech/web-ui` | UI-kit: DataTable, MapView, Layout.Matrix, Button… |
| `@capsuletech/web-query` | Декларативные эндпоинты ([`endpoints/`](../../src/endpoints/incidents.ts)) |
| `@capsuletech/web-renderer` | Рендер карточки по JSON-схеме ([`rendererSchemes/`](../../src/rendererSchemes/incidentCard.ts)) |
| `@capsuletech/web-router` | Навигация (`router.goTo(...)`) |
| `@capsuletech/web-state` | XState-обвязка, Bridge, теги |

---

> ⬅️ [Архитектура](architecture.md)
> 🏠 [К хабу документации](../README.md) · ➡️ [Фичи](../01-features/README.md) · ⬆️ [Наверх](#top)
