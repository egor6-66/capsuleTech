# Аудит: workspace zone (web-learn / web-studio / moderator)

- **Путь:** `packages/web/workspace/*`
- **Аудит:** 2026-07-07

Апп-хосты (домен-пакеты класса «апп минус Page/Feature»). **Оба на WIP-ветке `wip/v2-studio-learn-handoff`, активно в переработке.** Это последний рубеж переноса — зависит от валидации package-модели.

## ⚠️ Ключевой контекст (из [[project_current_checkpoint]] арх-разворота)

Закрытое решение user: **доменный пакет = АПП минус Page/Feature** — плоские слои `entities/ views/ shapes/ widgets/ controllers/` + `core/`, обёртки из `@capsuletech/web-core/wrappers`. **learn был ОШИБОЧНО назван эталоном** — его 3-ярусная `core/modules/shared` смешивает породы (сущности+feature-блоки+примитивы в одном; `shared/` = свалка с целой сущностью `words`; модули лезут друг в друга). Новая модель **ещё НЕ валидирована** — POC-гейт = greenfield `moderator` (пакет-View с тегом → app-Feature ловит по тегу, vitest). Красный POC → чинит owner-web-core (движок).

## @capsuletech/web-learn (0.0.0, skeleton) — 🟠 UNDER-QUESTION (мигрирует ПОСЛЕДНИМ)

3-ярусная `core/modules/shared` анатомия (**СТАРАЯ модель**). src=75 test=18 — substantial. Контент-конвейер vault→lang→learn, lessons/concepts/rules/drills, kit-first composition (Card-сущность, SectionedList/Article), nav-consolidation сделан.
**Проблема:** структура = старая 3-ярусная, которую закрытое решение заменяет на app-minus-layers. Модули завязаны на сущности (нарушение «модули не лезут друг в друга» — признано). На WIP-ветке.
**Действие:** **НЕ переносить as-is.** Порядок: (1) moderator POC валидирует app-minus-layers → (2) learn ре-анатомизируется под новую модель → (3) перенос. В v2-топологии learn = **отдельный ship-юнит `learn/`** (learn+lang+web-learn+app), не «зона». Богатый функционал сохраняется, раскладка меняется.

## @capsuletech/web-studio (0.0.0, alpha) — 🟠 UNDER-QUESTION (мигрирует ПОСЛЕДНИМ)

3-ярусная `core/modules/shared` (подведён под learn-анатомию mid-migration). src=65 test=15 — substantial: manifests/state/inspector/generators/canvas/tree/palette (design-time UI-хост). props-only(#2) + nav-consolidation брифы **не завершены** (owner-studio был остановлен mid-flight). 1 `eslint-disable no-explicit-any` в `inspector/kit.tsx` (source).
**Проблема:** та же старая 3-ярусная анатомия; props-only не добит (64 raw-класса были на снятие); nav ещё старый (WebStudio.Navigation). На WIP-ветке.
**Действие:** **НЕ переносить as-is.** Тот же порядок: после валидации модели → ре-анатомия → перенос. В v2 studio = **развилка топологии** (dev-tool vs продукт — repo-map). Composition rule (studio экспортит product-blocks, raw-движки в свои пакеты) — держать.

## moderator (пустой) — ⚪ N/A (POC-гейт, строится свежим в v2)

`packages/web/workspace/moderator/` — пустая директория (src=0). Greenfield POC-тестбед для валидации app-minus-layers модели ([[feedback_package_equals_app_layers]]). Бутстрап не сделан (брифы `web-core-wrappers-barrel` → `moderator-bootstrap-and-arch-poc` готовы, owner-сессии не запущены).
**Действие:** не мигрирует (нечего). В v2 — первый продукт, строится сразу в чистой земле (ADR 077: «moderator = первый продукт в v2»). Он и есть валидатор модели ДО переноса learn/studio.

## Итог по зоне

| Пакет | Вердикт |
|---|---|
| web-learn | 🟠 — старая 3-ярусная анатомия; мигрирует ПОСЛЕ валидации модели + ре-анатомии |
| web-studio | 🟠 — то же + props-only/nav не добиты; топология-развилка (dev-tool vs продукт) |
| moderator | ⚪ N/A — пустой POC-гейт, строится свежим в v2 |

**Зона `workspace` в v2 РАСТВОРЯЕТСЯ:** studio/learn = отдельные ship-юниты топологии (repo-map), не «зона» одного монорепо. zones.ts под это переосмыслить (см. compliance C1). **Порядок переноса:** workspace — САМЫЙ последний, гейтится moderator-POC + ре-анатомией. Богатый функционал (lessons/studio-editors) сохраняется, меняется раскладка.
