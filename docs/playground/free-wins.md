# 🎁 Free-wins — дёшево × высокий профит/вау

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md)

Фичи, которые впишутся **бесплатно или дёшево**, потому что нужный пакет уже есть или контракт/шина дают это даром. Шкала **Н/С/В** (низкая/средняя/высокая).

> ✅ **Статус: берём всё.** Каждая раскладывается на стадии в своей тематической доке (от дешёвого-и-раннего к вау-слою).

---

## 📋 Каталог

| # | Фича | Слож | Профит | Вау | Почему дёшево (на чём) |
|---|---|:--:|:--:|:--:|---|
| 1 | **Профайлер-оверлей** в preview/demo (FPS, память, web-vitals) | Н | В | В | **`web-profiler` УЖЕ готов** — 13 коллекторов + Dashboard |
| 2 | **State/FSM-инспектор** (живой state+context) | Н | В | В | Bridge экспозит `state`/`ctx` — наш Redux-devtools |
| 3 | **Live event-timeline** (поток событий аппа) | Н | С | В | WS-канал и так будет; монитор-подписчик. Предтеча flow |
| 4 | **Контракт-снапшоты = тесты даром** (рендер каждого case) | Н | В | С | как только есть contract cases |
| 5 | **a11y / axe-аудит** кейсов в demo-стенде | Н | В | С | `axe-core` + рендеримые кейсы |
| 6 | **Theme-matrix**: компонент во ВСЕХ 11 темах сразу | Н | С | В | `DISCOVERED_THEMES` + scoped `data-theme` |
| 7 | **tokens.json экспорт** (Figma round-trip, W3C DTCG) | Н | В | С | ADR 042 §6 + `editor/oklch.ts` планово |
| 8 | **Mock-from-schema** (faker по zod endpoint) | С | В | С | mock-инициатива + схемы web-query |
| 9 | **Request/response инспектор** (лог API) | Н | С | С | middleware-pipeline web-query |
| 10 | **Token-usage инспектор** (какие токены жрёт компонент) | С | В | С | computed style → `--vars` |
| 11 | **Canvas → код** (schema → исходник capsule) | С | В | В | web-renderer schema описывает дерево |
| 12 | **FSM → граф-диаграмма** | С | С | В | xstate граф + flow (logic-editor предтеча) |
| 13 | **Time-travel / replay** event-потока | С | С | В | запись WS-потока + повтор |
| 14 | **In-context правка текста** (клик по тексту → ключ copy) | С | С | В | web-intl + `meta` из UiProxy |
| 15 | **Missing-translation отчёт** | Н | С | С | diff по web-intl registry |
| 16 | **Auto-props-playground** (controls как в Storybook) | Н | С | С | inspector мапит schema→контролы |
| 17 | **Responsive/breakpoint превью** | Н | С | С | `--breakpoint-*` токены |
| 18 | **Branch/PR-превью** (деплой по ветке) | Н | В | С | build-метадата несёт branch (priority 1) |
| 19 | **Bundle-size по фиче-сету** | С | С | С | forge build stats |
| 20 | **Cmd-K command-palette** | Н | С | С | kobalte уже dep |
| 21 | **QR на превью-ссылку** (мобайл-тест) | Н | Н | Н | preview URL + qr |
| 22 | **Pseudo-localization** (растяжка текста под тест вёрстки) | Н | Н | С | трансформ над web-intl dict |

---

## ⭐ Топ-пики (дёшево × максимум отдачи)

- **#1 Профайлер-оверлей** — буквально бесплатно (пакет готов), мгновенный вау.
- **#2 + #3 State/FSM-инспектор + event-timeline** — наш devtools и естественная **предтеча flow** (тот же поток, сначала простой UI → потом красивый граф).
- **#6 Theme-matrix** — холодный вау для демо заказчику, копейки.
- **#4 + #5 контракт-тесты + a11y** — качество эталона даром.
- **#11 Canvas → код** — шаг к «полному флоу создания апп через редактор».
