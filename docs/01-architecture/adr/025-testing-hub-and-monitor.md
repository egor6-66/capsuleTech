---
tags: [hca, adr, testing, hub, profiler, monitor, proposed]
status: proposed
date: 2026-06-02
---

# ADR 025 — Testing Hub + детачабл runtime-монитор

> [!note] Status: proposed (2026-06-02)
> Превью-сервер (ADR 024) вырастает в **testing-платформу**: capsule-app `apps/testhub` (раздаётся в корне), бэкенд в preview-server (self-contained), метаданные апп (git/доки/версия) снимаются на деплое, апп запускаются внутри хаба через iframe. Параллельно — **универсальный runtime-монитор** как расширение `@capsuletech/web-profiler` (perf + логи + данные в одном месте), оформленный **детачабл-слоем**: подключается opt-in, не пускает корни в движок. Итеративно (И1→И4+).

## Контекст {#context}

ADR 024 дал **третью ось релиза** — хостинг превью-сборок (`docker/preview-server/` + `scripts/deploy-preview.mjs`, path-based раздача под `base`, `--mocks`). Работает, тестеры открывают `http://server/ewc/`.

Запрос: превратить это в **полноценный инструмент для тестирования**. Один Docker на сервере поднимает хост; в нём — каталог апп, заход/тест внутри хаба, фидбек/вопросы, доки и git-инфа, мониторинг (стейт / ответы бэка / ошибки), в будущем — версии, чат тестер↔разраб, hot-reload, пакеты. Строим «на примере ewc» — стандартным capsule-флоу (догфуд).

Тестеры сейчас пишут ручные тесты на Python (Selenium/Playwright); один из их запросов — стабильные атрибуты в HTML-тегах под селекторы.

## Решения {#decisions}

### 1. Хост-UI — отдельный capsule-app (`apps/testhub`)

Хаб — обычное capsule-приложение (Entity/View/Widget/Page/Feature), ходит в бэкенд через `web-query`. Раздаётся preview-сервером в **корне `/`** (апп-билды — под их `base`, напр. `/ewc/`). Догфуд фреймворка = лучший стресс-тест. Альтернатива (растить HTML в `server.mjs`) отклонена — не capsule-native, потолок на фидбеке/чате.

### 2. Бэкенд — внутри preview-server, self-contained

Каталог апп (есть) + API фидбека/гита/доков/версий + раздача билдов — всё в том же контейнере. Хранилище — SQLite/JSON в Docker-volume. Держит модель «один docker run». Capsule-backend (Rust) — мощнее под чат/auth/real-time, но не self-contained; отложено до чата (отдельный ADR).

### 3. Метаданные апп снимаются **на деплое**

Билд — статика, в нём нет ни `.git`, ни `docs/`. Поэтому `deploy-preview.mjs` на деплое:
- снимает git-состояние репо (ветка / коммит / автор / дата / сообщение),
- кладёт `apps/<app>/docs/` + README в загрузку,
- шлёт как метаданные (заголовки/манифест) — ровно как сейчас едет `base` в `X-Capsule-Base`.

Сервер хранит per-app/версия; хаб показывает git-блок и рендерит доки (markdown). Закрытый контур: сервер сам в git не ходит.

### 4. Запуск апп внутри хаба — через iframe

Хаб = шелл (сайдбар: апп → версии) + вьюпорт `<iframe src="/ewc/">`, переключение = смена src. **iframe не косметика, а корректность**: каждый capsule-app — независимый билд со своим **синглтон-роутером** и **глобальным реестром** (`Widgets/Views/…` через `globalThis`). Два аппа в одном JS-контексте подерутся за глобалы и history. iframe изолирует чисто; хаб↔апп общаются через `postMessage` (канал для монитора и тестер-фич). `@capsuletech/web-remote` (in-host композиция без iframe) — будущее, сейчас Phase 0 (пустой рантайм).

### 5. Версии — по имени ветки, группировка по аппу

Версия = ветка деплоя (из git-захвата, п.3). Сервер хранит `${DATA_DIR}/<app>/<branch>/`, хаб группирует по аппу + свитчер версий, фидбек привязан к версии. Нюанс: `base` билда должен включать версию (`/ewc/<branch>/`) — решается на деплое (билд с `base=/<app>/<branch>/`). Раскладка заложена в ADR 024 (`FUTURE(versioning)`).

### 6. Монитор — расширение `@capsuletech/web-profiler` (детачабл-слой)

Единый runtime-монитор (**perf + логи + данные в одном месте**) — НЕ новый пакет, а **расширение профайлера** (collector-pattern уже есть: `core/bus.ts` MetricsBus ← collectors → reporters + `widget/dashboard.tsx` с панелями). Добавляем:
- **collectors**: `query` (кэш + пайплайн web-query → запросы/ответы/ошибки/статусы), `state` (web-state Bridge → FSM-стейт + стор), `logs` (console/structured).
- **панели** в дашборд: Query (инспектор кэша — дерево запросов, статусы, данные, ошибки, инвалидации; **TanStack-devtools-like, но из нашего кэша** — web-query свой, не на @tanstack/solid-query), State (текущий FSM + стор), Logs.

Используется **локально** (`ProfilerProvider` в dev, как сейчас) И в хабе (стримится из iframe через `postMessage` в панель хаба / отдельное окно `window.open`).

> [!important] Детачабл-принцип
> Монитор/тестинг **не пускает корни в движок** — подключается opt-in и «отваливается» без следа. Источники данных (web-query, web-state, core) выставляют **инертные seam'ы** (no-op по умолчанию: monitor-middleware в пайплайне web-query, read-API `cache.entries()/subscribe()`, реактивный Bridge web-state, `onError`/`safeCall` в core). Монитор (профайлер) подписывается, **если подключён**. Снёс профайлер → seam'ы инертны: ноль связи, ноль рантайм-стоимости, движок не знает о мониторе. Никаких импортов profiler из web-core/web-query/web-state.

### 7. Runtime-config слой (env/роль на лету) — отдельная фича фреймворка

Менять API-URL/роль/env **после** деплоя, per-тестер, без пересборки — это runtime-оверрайды: апп читает их из рантайма (хаб инжектит через `window.__CAPSULE_RUNTIME__` / `config.js` / fetch `/api/config/:app`), build-time (`import.meta.env`, `capsule.app.ts`) — дефолт-фоллбек. Затрагивает web-query/app-config + панель в хабе + стор. Самый крупный пункт — своя итерация/под-ADR.

### 8. Тестер-affordances — auto `data-testid` + `--test` флаг

- **Авто-`data-testid`/ARIA из `meta`**: HCA уже регистрирует элементы по `meta`/тегам (UiProxy) → генерим стабильные селекторы **без ручной разметки девами** (прямой ответ на запрос тестеров). Стабилизирует их Python-селекторы.
- **`--test` build-флаг** (брат `--mocks`): testid-эмиссия + детерминированные сид-моки (воспроизводимость) + off-анимации + `window.__capsule_test__` хуки для драйвера + монитор on.
- Доп.: рекордер действий (события идут через Proxy), скриншоты per-версия, контроль моков/сети из хаба.

## Роадмап (итеративно)

| Итерация | Что | Главные зоны |
|---|---|---|
| **И0** ✅ | preview-server + path-based + deploy-клиент + `--mocks` + лендинг (ADR 024) | done |
| **И1** | `apps/testhub`: каталог апп + iframe-воркспейс (сайдбар/свитчер), вместо HTML-лендинга | apps/testhub, preview-server (serve root + `/api/apps`) |
| **И2** | Метаданные: git-захват + доки/README на деплое → сервер → хаб (git-блок + markdown-доки) | deploy-preview (capture), preview-server (store/API), apps/testhub |
| **И3** | Фидбек/вопросы: стор + API (SQLite/JSON в volume), панель в хабе (оставить/список/open-resolved) | preview-server (backend), apps/testhub |
| **И4** | Монитор v1: расширение web-profiler (Query+State+Logs collectors/панели) + seam'ы + стрим в хаб | owner-web-profiler, owner-web-query, web-state, apps/testhub |
| **И5** | Версии по ветке (раскладка `/<app>/<branch>/`, свитчер, фидбек на версию) | deploy-preview, preview-server, apps/testhub |
| **И6** | Тестер-affordances: auto `data-testid` из meta + `--test` флаг + сид-моки | owner-web-core (UiProxy), owner-builders (флаг), apps |
| **И7** | Runtime-config (env/API-URL/роль на лету) | owner-web-query/app-config, preview-server, apps/testhub |
| **Дальше** | Чат тестер↔разраб, hot-reload на удалённый сервер, пакеты — отдельными ADR | — |

Порядок гибкий: И4 (монитор) и И6 (`data-testid`) — самые ценные/дешёвые для тестеров, можно поднять раньше.

## Последствия {#consequences}

- ✅ Тестинг-платформа собрана **стандартным capsule-флоу** — догфуд + showcase.
- ✅ Монитор детачабл: движок чист, монитор переиспользуется локально.
- ✅ Self-contained: «один docker run», закрытый контур (метаданные едут с деплоем, не из git с сервера).
- ✅ iframe-изоляция снимает конфликт синглтон-роутера/глобал-реестра между апп.
- ⚠️ iframe-границы → хаб↔апп только через `postMessage` (для монитора/драйвера — спроектировать протокол).
- ⚠️ Runtime-config (И7) трогает API-слой — самый рискованный пункт, отдельный под-ADR.
- ⚠️ Бэкенд в Node-сервере достаточен до чата; чат/real-time потребуют пересмотра (capsule-backend) — отдельный ADR.

## Открытые вопросы (решаем по ходу итераций)

- Точный механизм seam'ов монитора (глобальный instrument-хук vs context vs shared event-bus) — И4.
- `base` с версией: билд-тайм `base=/<app>/<branch>/` vs серверный rewrite — И5.
- Форма runtime-config (per-app / per-tester / persist) — И7.
- Имя/identity хаба, auth тестеров (сейчас mock) — И1/И3.

## Будущая работа

- Чат тестер↔разраб (real-time, вероятно capsule-backend).
- Hot-reload на удалённый сервер (push изменений без полного редеплоя).
- Пакеты (не только апп-билды).
- Графитация `deploy-preview.mjs` → `capsule deploy` (owner-cli, из ADR 024).
