# 🎮 3D, движки и игры — canvas (north-star)

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md) · 🎮 [3D/Движки](canvas-3d.md)

> 🌌 **Far-future / north-star.** Опциональная тяжёлая фича — юзер осознанно платит размером/скоростью. На ближнем роадмапе НЕТ. Здесь — стратегия, чтобы **не закрыть дверь** при проектировании canvas/desktop/forge.

---

## 🎯 Два кейса

| Кейс | Что | Embedding |
|---|---|---|
| **1. capsule как Steam (лаунчер)** | нативная игра (AAA) в **отдельном окне**; capsule = лаунчер + монитор + управление сервером (forge) + чат | НЕ нужно. Tauri process-spawn + **launch-args** (адрес сервера/ник/токен; Unreal/Unity нативно принимают connect-URL) |
| **2. Рендер В аппе (canvas)** | веб-сборка движка (WebGL/WASM) в `<canvas>` внутри DOM → наш canvas-адаптер | да — но **только для веб-сборок** |

> ⚠️ «Внутри окна» для native `.exe` = OS-reparenting (Win `SetParent` / X11 `XEmbed`) — хакерски, Wayland/macOS плохо, для игр (фуллскрин/swapchain) бриттл. Реалистично — **отдельное окно + оверлей** (как Steam). Истинное embedding в DOM — только у веб-сборок.

---

## 🧭 Ландшафт движков + решение

| Движок | Веб | Редактор | Статус | Роль у нас |
|---|---|---|---|---|
| **Unity** | WebGL (поддерживается) | полный | живой | **интеграция ПЕРВОЙ** (BYO-движок) |
| **Babylon.js** | нативно (+ WebGPU) | есть (+ наш) | живой | **наш редактор ПОЗЖЕ** |
| Three.js | нативно | базовый | живой | лёгкая виз/мониторинг |
| Unreal | native (лаунчер) / web legacy | полный | web — **депрекейт** | native через лаунчер; web — Wonder Interactive (комм., UE→WebGPU) / community UE4 HTML5 (legacy) |

**План:** **Unity-интеграция сейчас → свой Babylon-редактор позже.** Оба — под одним адаптером.

> «Свой движок с нуля» (класса Unreal) — **нет** (сотни человеко-лет). «Свой **редактор** над Babylon» (рендер+физика Havok+glTF+WebGPU готовы, мы строим editor через creator+contracts+canvas, 3D-сущности = «компоненты») — **да, наша поляна**. Реалистичный масштаб = сцена/3D-редактор, не AAA-движок.

---

## 🔌 Объединяющий паттерн: canvas-адаптер + event-bus

- Любой движок = **`ICanvasEngineAdapter`** (owner-canvas), экспонирующий ОДИН `send`/`on` (JSON).
- Контракт держим **engine-agnostic** + открытым под **«сетевой нативный движок»** (локальный рендер + внешний авторитетный сервер).
- **Монитор/виз = поток событий; рендерер (стандарт / flow / Unity / Babylon) — сменный мод над ОДНИМ потоком.** «Подрубить Unreal/Unity» = просто ещё один renderer-мод.

---

## 🌉 Мост (двусторонние ивенты, WS-подобно)

- **Unity WebGL:** JS→Unity `SendMessage(obj, method, json)`; Unity→JS `.jslib` + `[DllImport("__Internal")]`. Обёртка → наш event-bus.
- **Emscripten** (UE HTML5 / Babylon-WASM): `ccall`/`EM_ASM` ↔ JS-колбэк — аналогично.
- В проекте движка — тонкий **`CapsuleBridge`** (даём шаблон). Вес ~КБ. In-process (быстрее сети), но интерфейс = наш WS-протокол → транспорт-агностично.

---

## 🕹️ Мультиплеер / dedicated server

- **Dedicated Server** (headless, без GPU) — **forge оркестрирует** (Linux-контейнер, ephemeral на матч). Концепт един для Unreal/Unity.
- **Unity:** сеть НЕ в ядре → netcode-пакет: **NGO** (офиц., бесплатный) / **Mirror** (community). У Unreal — встроено.
- **Транспорт:** WebGL-клиент → **WebSocket(S)** (браузер без raw UDP) → ложится на **forge-шлюз**; native-клиент → **UDP**.

---

## 📦 Веса (по сети, первый заход, сжато)

| | baseline |
|---|---|
| bridge | ~КБ |
| Three.js | ~0.15 МБ |
| Babylon.js | ~1–2 МБ |
| Unity WebGL рантайм | ~5–10 МБ |

+ контент сверху. Ужать: **Brotli** + серверные заголовки, **IL2CPP stripping**, минимальный профиль. RAM ≠ download (Unity резервит WASM-heap ~256 МБ+).

→ Лёгкая виз (мониторинг) — **Three/Babylon** (на порядок легче). **Unity** — когда нужен полноценный 3D/редактор/контент.

---

## 🧷 Что закладываем СЕЙЧАС (чтобы дверь не закрыть)

- `ICanvasEngineAdapter` (owner-canvas) — **engine-agnostic** + «сетевой нативный движок».
- **Один event-bus** на все движки (= наш WS-протокол).
- forge-оркестрация контейнеров **обобщается** на dedicated-server.
- desktop (Tauri) **sidecar + launch-args** — будущий примитив `@capsuletech/desktop`.

Остальное (Unity-адаптер, Babylon-редактор, netcode, лаунчер) — **когда дойдём**. Сейчас — только не закрыть дверь контрактами.
