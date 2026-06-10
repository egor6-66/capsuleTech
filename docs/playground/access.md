# 🔐 Access — gate-ось (роли / entitlements / флаги)

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md) · 🔐 [Access](access.md)

> 🔒 Внутренний (dev) трек. **Стюард — главный** (как `web-contract`; access = сквозная архитектура, не пакет-домен → отдельного owner-web-access нет). Триггер — кейс `apps/playground/src/shapes/shellNavigation.tsx`: резать навигацию по роли без `if/else`/`switch` в коде аппа.

> 🧭 **Единая gate-ось.** Authn (логин) + RBAC (роли) + entitlements (tenant) + feature-toggle/inject (ADR 041) — это НЕ четыре механизма, а ОДНА ось: capability — универсальная валюта, enforce'ится в разных точках (build-inject / route-guard / nav / element). Подробности — секции «Три источника» и «Как стыкуется».

---

## 🧠 Ментальная модель (за 30 секунд)

> 💡 **Пермишн — это свойство назначения, а не ветка в коде.** Пункт/кнопка/роут несёт тег `can: '<capability>'`. Один реактивный резолвер `can(cap)` отвечает «показывать?». Ветвление существует ровно в одном месте (резолвер), а не размазано по виджетам.

Ключевое наблюдение: в playground **gating уже есть** — это `entitlements` (что tenant купил, build-time+runtime, [platform.md](platform.md)). Роли из shellNavigation — это **вторая ось того же гейтинга** (RBAC). Не плодим параллельные механизмы — делаем **одну gate-ось с разными источниками**.

```
тег на данных (can)  →  резолвер can()  →  enforcement (фильтр / meta.can / route-guard / build-композиция)
        ▲                     ▲
  декларация назначения   провайдеры: role(useAuth) · entitlement(tenant) · flag
```

Access встаёт **L1.5 сквозным рантаймом** рядом с `web-intl` / `web-state` / `web-style` — симметрично оси `tenant ⟂ intl/style/build`. Здесь `access ⟂ всё`.

---

## 🎛️ Три источника, один резолвер

Все сводятся к одному вопросу `can(capability) → boolean` (реактивно). Отвечают **провайдеры**, зарегистрированные аппом (инъекция, ADR 041 `inject=app`):

| Провайдер | Источник | Грант, если | Где живёт |
|---|---|---|---|
| 🔑 **authn** (база) | `useAuth()` залогинен? | precondition: не залогинен → guard делает login-redirect; даёт identity/роль | `web-auth/session` |
| 🧑‍💼 **role** (RBAC) | `useAuth().role` | `cap ∈ policy[role]` | `web-auth` отдаёт роль; policy = app `access.json` |
| 🏷️ **entitlement** (tenant) | tenant-конфиг | `cap ∈ tenant.entitlements` | platform / tenant-ось (уже есть) |
| 🚩 **flag** (позже) | env / A-B / beta | `cap ∈ enabledFlags` | runtime-конфиг |

> 🔑 **authn — особый:** это не «грант capability», а **первая проверка гарда** (залогинен?) + источник роли. Поэтому у роута два требования: `auth` (нужен логин → login-redirect) и `can` (нужна capability → forbidden). Один guard, два режима провала.

**Композиция провайдеров — по умолчанию AND** (показываем, только если роль разрешает **И** tenant купил). Провайдер, которому capability «не его», возвращает `grant` (не блокирует). Семантику слияния делаем конфигурируемой (`mode: 'all' | 'any'`), но дефолт — `all`.

> Capability — абстрактный namespace-строка (`workspace.builds`, `billing.refund`). В примере ниже короткие слаги под нав.

---

## 🧩 Три слоя

### 1️⃣ Декларация — тег `can` на данных/компоненте

```ts
// nav item (Shape)
{ label: 'Builds', to: '/workspace/builds', can: 'builds' }

// route (Page meta) — single source для guard + авто-нав
Page(..., { meta: { can: 'builds' } })

// произвольный UI-элемент
<Ui.Button meta={{ can: 'billing.refund' }}>Возврат</Ui.Button>
```

Schema `shellNavigation` расширяется опциональным полем:
```ts
schema: zod.array(zod.object({
  label: zod.string(),
  to: zod.string(),
  can: zod.string().optional(),   // нет can → виден всегда
})),
```

**Почему capability, а не роль на пункте.** `roles: ['admin','dev']` на пункте — это тот же `if` в данных: добавил роль → правишь каждый пункт. Capability расцепляет: пункт знает «мне нужен `builds`», policy знает «у кого есть `builds`». Добавление роли → правка одной строки policy.

### 2️⃣ Конфиг — `access.json` (как theme/copy/fsm)

Выход редактора, schema-валидируется, портативен, грузится в рантайме — ровно по принципу «всё в JSON-конфигах» ([architecture.md](architecture.md)).

```json
{
  "roles": {
    "admin":     ["*"],
    "developer": ["routing","source","builds","devops","ui","logic","styles"],
    "support":   ["routing","ui","words"]
  }
}
```

Entitlement-провайдер читает `tenant.entitlements` из того же customization-бандла, что и forge ([platform.md](platform.md)) — **build-time композиция фич и runtime-RBAC используют один словарь capability**.

### 3️⃣ Enforcement — generic, без `if/else`

| Точка | Механизм | Поведение |
|---|---|---|
| 📋 **список/нав** | batch-рендер фильтрует пункты по `can(item.can)` (convention) | пункт исчезает |
| 🔘 **элемент** | `meta: { can }` резолвится в **UiProxy** (он уже перехватывает `meta`) | render-null **или** `disabled` (opt-in) |
| 🛣️ **роут** | ОДИН unified guard (web-router) читает `Page.meta { auth, can }` → спрашивает резолвер | `auth` нет → login-redirect; `can` нет → 403/404. **Заменяет ручной guest/authed-бранчинг `Features.App`** (рефактор staged, с ОК) |
| 🏗️ **build / inject** | forge читает entitlements → какие feature-модули компилируются/инжектятся (ADR 041 inject=app) | тонкий артефакт; «фича в сборке?» = та же capability на build-точке (platform.md) |

> ⚠️ Для нав — **фильтр данных** (чисто). Для кнопки в `attached`-группе render-null оставит визуальную дыру → там дефолт `disabled`, render-null opt-in. Согласовать (открытый вопрос Q3).

---

## 🔌 API (черновик)

```ts
// bootstrap аппа (инъекция провайдеров)
registerAccessProvider(roleProvider(accessJson));        // role ∈ policy
registerAccessProvider(entitlementProvider(tenant));      // tenant.entitlements

// в любом слое
const can = usePermissions();   // can('builds'): boolean, реактивно (от useAuth().role)

// опциональный gate-компонент
<Can cap="builds">{/* ... */}</Can>
```

`usePermissions` — тонкая обёртка: подписка на провайдеры + `*`-wildcard + namespace-prefix матчинг. Реактивность из `useAuth()` (web-auth уже даёт реактивную `role`) и tenant-store.

---

## 🌐 Как стыкуется с остальным playground

| Подсистема | Стык | Профит |
|---|---|---|
| 🏷️ **tenant / entitlements** | entitlement = провайдер той же gate-оси | build-time фичи и runtime-RBAC = один словарь capability |
| 🧾 **всё в JSON** | `access.json` рядом с theme/copy/fsm | портативен, редактируем, едет в forge-бандле |
| 📡 **monitoring (WS-трейс)** | denied-гейт = событие `access.deny` в общем потоке | видимость доступа на мониторе **бесплатно**, без инструментации |
| 📐 **web-contract** | примитив `rule.gated()` — компонент декларирует, что он гейтится | редактор **зажигает панель привязки доступа** по контракту (rules-as-plugins) |
| 🧰 **web-creator** | будущий редактор доступа (subpath `/access` или часть `/logic`) → производит `access.json` | визуальная правка ролей/прав |
| 🔑 **web-auth** | role-провайдер берёт `useAuth().role`; policy остаётся в аппе (types.ts: «маппинг роль→права живёт в АППЕ») | auth не знает про app-specific права |

---

## 📦 Топология пакета (на решение)

**Вариант A — отдельный `@capsuletech/web-access` (рекоменд.).** Тонкий L1.5 сквозной рантайм: резолвер + `usePermissions`/`<Can>` + registry провайдеров. role-провайдер тянет `useAuth` из web-auth; entitlement-провайдер — tenant. Симметрично web-intl/web-state.
- ➕ entitlement **не живёт в auth**; один `can()` для роли+tenant+флагов; чистая ось.
- ➖ ещё один пакет (но политика playground — subpaths/мало пакетов; этот — sibling сквозных рантаймов, оправдан).

**Вариант B — subpath `@capsuletech/web-auth/policy`.** Только RBAC; entitlement отдельно.
- ➕ ноль новых пакетов.
- ➖ разводит роль и entitlement по разным механизмам → теряем главную выгоду (один резолвер). Для shellNavigation хватит, но не масштабируется в платформенный gating.

**✅ Решение (главный):** берём **A — `web-access` сразу**, **стюардит главный** (без owner-web-access). «Стартануть в web-auth → вынести позже» НЕ делаем — это churn + breaking в публичном API web-auth. `web-access` уходит в scaffold-батч рядом с `web-contract`/`web-creator`.

---

## 🪜 Фазы

| Шаг | Что | Зона |
|---|---|---|
| **A0** | резолвер `can()` + `usePermissions` + role-провайдер от `useAuth()`; `access.json`-схема | owner-web-auth (или owner-web-access если A) |
| **A1** | `meta: { can }` в UiProxy (render-null / disabled) | owner-web-core |
| **A2** | convention-фильтр `can` в batch-рендере нав/списков | owner-web-ui / owner-web-table |
| **A3** | route-guard от `Page.meta.can` | owner-web-router |
| **A4** | entitlement-провайдер (tenant) + слияние `all/any` → вынос в `web-access` | главный + tenant-зона |
| **A5** | `rule.gated()` контракт-примитив + панель доступа в редакторе | web-contract + owner-web-creator |
| **A6** | `access.deny` событие в WS-трейс → монитор | monitor-зона |

shellNavigation чинится на **A0+A2** (минимальный срез).

## ✅ Статус реализации (playground-срез, 2026-06-09)

| Часть | Статус |
|---|---|
| **A0** резолвер + role-провайдер (`web-access`) + `setupAccess` | ✅ сделано |
| **A2** nav-filter (Shape `item.can`, web-core sink) | ✅ сделано |
| **A1** `meta.can` элементов (UiProxy, web-core) | ✅ движок готов, в аппе пока не используется |
| Authn **persist+rehydrate** (`configureAuthSession`, web-auth) + restore в `Features.App.guest.onInit` | ✅ сделано |
| Мок role+password (developer/`d1`, designer/`123`, devops/`d2`) | ✅ сделано |

**Осталось:**
- 🔸 **A3 — URL-guard.** Прямой заход по URL ещё достижим (нав прячет, роут — нет). Нужно: web-router `beforeLoad` читает capability роута → `resolveAccess` (web-core) → `redirect`; роут НЕСЁТ capability через **RouterPlugin (owner-builders) → `Page.meta.can` в route staticData**. (+1 скоуп: builders.)
- 🔸 **Промоут в декларатив.** Сейчас `setupAccess`/`configureAuthSession` — side-effect в `capsule.app.ts`. Промоут до полей `access:` / `auth:` в `defineAppConfig` (генератор, как `intl`/`api`).
- 🔸 **entitlement / flag-провайдеры** + multi-tenant + `mode:'any'` слияние — позже.
- 🔸 `<Can>` + `meta.can` в аппе — по мере надобности (движок готов).

---

## ✅ Зафиксировано (главный, 2026-06-09)

- **Q1** — **capability** (не роль на пункте). Канон.
- **Q2** — **A: `web-access`**, стюард главный, в scaffold-батч.
- **Q3** — нав = **фильтр данных** (исчезает); кнопка/действие = **`disabled`** дефолт, render-null opt-in.
- **Q4** — канон-цель = **`can` на роуте** (`Page.meta`, single source). Пока нав ручной → временно `item.can` + `Page.meta.can`, сходимся к нав-из-роутов позже.
- **Q5** — слияние провайдеров дефолт **`all`** (роль И tenant), `any` конфигурируемо.
- **Q6** — capability **дот-namespace** (`workspace.builds`), `*`=всё, префикс-грант `workspace.*`. Для нав-слайса — короткие слаги ок.
- **+ Унификация:** authn-гард (`Features.App` guest/authed) сливается в ОДИН route-guard (`Page.meta { auth, can }`); feature-toggle/inject = та же ось на build-точке (forge). Рефактор `Features.App` — staged, с ОК.

## ❓ Детализация вопросов (контекст решений выше)

1. **Q1 — capability vs роль на пункте.** Главный за capability (расцепляет, масштабируется на entitlements). Принять как канон?
2. **Q2 — пакет.** `web-access` (A, рекоменд.) vs `web-auth/policy` (B)? Влияет на то, как ляжет entitlement-ось.
3. **Q3 — поведение denied-элемента.** Нав = фильтр данных (исчезает). Кнопка/действие = `disabled` дефолт + render-null opt-in, или наоборот? Для `attached`-групп render-null оставляет дыру.
4. **Q4 — single source of truth.** Декларировать `can` на **роуте** (`Page.meta`, DRY: нав авто-генерится + guard из одного места) или на **пункте нав** (быстрее, но меню и guard объявляются раздельно)? playground сейчас строит нав руками (`defaults`).
5. **Q5 — слияние провайдеров.** Дефолт `all` (роль И tenant) — подтвердить; где конфигурится `any`.
6. **Q6 — `*`-wildcard и namespace.** Формат capability (`workspace.builds` dot-namespaced?) и семантика `admin: ['*']` / префиксных грантов (`workspace.*`).

---

## 🔗 Связки

- Кейс-триггер: `apps/playground/src/shapes/shellNavigation.tsx`
- Источник роли/сессии: `@capsuletech/web-auth/session` (`useAuth()`), `web-auth/role`
- Сквозные оси: [architecture.md](architecture.md) (tenant ⟂ intl/style/build)
- Entitlements/tenant: [platform.md](platform.md)
- Контракт-примитивы (`rule.*`): [contracts.md](contracts.md)
- Трейс/монитор: [monitoring-flow.md](monitoring-flow.md)
