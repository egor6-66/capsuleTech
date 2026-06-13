# ⌨️ web-code — редактор кода

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md)

`@capsuletech/web-code` — мощный браузерный редактор уровня IDE. Основа для правки конфигов редакторов и (позже) полноценной работы с кодом в воркспейсе.

---

## 🧠 Ментальная модель {#mental-model}

> 💡 Движок — **Monaco напрямую** (это редактор VS Code, полный TS-IDE из коробки). **Без adapter-абстракции** — берём Monaco в базу и строим на нём. Два яруса по тому, где живёт ground-truth тулчейна.

Заложено в [ADR 037](../01-architecture/adr/037-playground-capability-and-codegen-subgenerators.md): Shiki (подсветка) + Monaco/CodeMirror (правка) в пакете код-вью.

---

## 🪜 Два яруса

| Ярус | Что даёт | На чём |
|---|---|---|
| **1 — standalone** (без контейнера) | настоящий TS-IntelliSense, диагностика, format, JSON-schema-валидация — для одного/нескольких файлов | Monaco + `@typescript/vfs` + ATA (`.d.ts` из npm) + Shiki + prettier |
| **2 — container-backed** (с forge) | project-wide typecheck с нашими алиасами, **реальный LSP**, build, тесты | тонкий клиент к тулчейну в контейнере по WS |

> 💡 Ярус 1 закрывает **правку JSON-конфигов редакторов** (theme/copy/tree/fsm — schema-validated, мгновенно). Ярус 2 превращает тот же редактор в полный код-IDE для платформы. **Один пакет, два режима.**

---

## 🌍 Языки v1 — «всё бесплатное»

- **Подсветка:** Shiki / TextMate — практически всё (TS/JS/JSON/CSS/MD/Rust/…).
- **Умный** (автокомплит/диагностика): **TS** (vfs+ATA) + **JSON** (JSON Schema).
- Прочие языки — подсветка + format; LSP — из контейнера (ярус 2).

---

## 🎁 Capsule-уникальные выигрыши

- 🧾 **Наши config-схемы → JSON Schema** в редакторе: правишь `theme.json` / `copy.json` / entitlements — редактор валидирует и автокомплитит по нашей схеме.
- 🛡️ **`compliance` в браузере** — гоняем AST-линтер по TS → HCA-нарушения (upward/horizontal) подсвечиваются inline. Наша архитектура как фича.
- 🎨 prettier (уже dep) — format-on-save.

---

## ⚠️ Риски (честно)

- 🎨 **Темизация Monaco** — своя система; под наши токены нужен мост (theme-bridge).
- 📦 **Monaco + Vite** — известная возня с web-workers / бандлингом (`monaco-editor/esm`). Решаемо, не бесплатно.

---

## 🪜 Порядок

1. **standalone** (правка JSON-конфигов редакторов) — первым.
2. **container-backed** IDE — с приходом forge (priority 4).
