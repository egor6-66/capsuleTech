---
title: apps/learn — свичер image-движка в шелл-меню (зеркало voice-свичера)
status: ready (СТАРТ ПОСЛЕ backend-image-service.md; для картинок в UI нужен ещё backend-learn-image-compose)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [067, 068]
---

# Контекст

Решение user: image-движок переключается в шелл-меню как voice-движок.
Механика уже обкатана voice-свичером (Shell.Picker + app-глобальный концерн
в root Features.App + persist localStorage) — зеркалим её, НЕ изобретаем.

# Scope (только apps/learn)

1. `endpoints/image.ts` — зеркало `endpoints/voice.ts`: GET `/image/engines`
   (base `default`='/api' уже относительный) → `{ engines, default }`.
2. `features/app.tsx` (image = app-глобальный концерн, как voice — канон
   feedback_app_feature_scopes соблюдён):
   - context: `imageEngines: []`, `imageEngine: localStorage('learn-image-engine') ?? default`;
   - onInit: фетч engines + откат персиста на default если движка больше нет
     (копия voice-логики);
   - `onPick` с `name='image-engine'` (существующий voice-picker живёт на
     `name='engine'` — НЕ трогать).
3. Хедер: второй `<Shell.Picker mode="sub" name="image-engine">` в Menu рядом
   с voice-свичером. meta.tags capsule.app.ts дополнить при необходимости.
4. Прокидывание выбранного движка в реальные запросы картинок — БУДУЩИЙ шаг
   (когда learn-выдача принесёт image.url, `&engine=` добавляется как в 🔊-флоу
   onSpeak). Сейчас — только свичер+персист.

# Acceptance

build+biome 0; live через `:8080/learn/` (backend/image :8005 поднят): свичер
в меню кажет движки, выбор переживает F5; voice-свичер не сломан.
