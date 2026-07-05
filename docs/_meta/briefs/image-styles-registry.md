---
title: backend/image — styles-реестр: render?style=&subject=, детерминизм seed, версия стиля в кэш-ключе
status: ready
audience: owner-сессия `claude-scope -Scope backend-image` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [065, 067]
---

# Контекст (решение user 2026-07-05)

Картинки слов должны быть в ЕДИНОМ стиле и «всегда одни и те же». Канон:
- **стиль = first-class данные image-сервиса** (как голоса у voice) — реестр
  пресетов, конфигурируемый файлом;
- **стабильность = детерминизм, не хранение**: кэш-ключ включает style@version,
  seed выводится из subject;
- потребители выбирают стиль per-контекст (learn — бренд-стиль конфигом,
  будущие места — свой или прокинутый от юзера).

# Scope (backend/image)

1. **Реестр стилей** — файл `styles.yaml` рядом с сервисом (путь конфигом,
   `IMAGE_STYLES_PATH`; дефолтный файл в репо сервиса):
   ```yaml
   word-flat:
     version: 1
     template: "a simple flat illustration of {subject}, clean vector style, soft colors, no text"
     negative: "photo, realistic, watermark, text, letters"
     size: 512x512
     engine: sdxl-turbo        # дефолт, ?engine= переопределяет
     seed: subject             # политика: seed = стабильный hash(subject); либо число
   ```
   Загружается на старте (+ перечитывание не нужно — рестарт ок).
2. **API**: `GET /image/render?style=word-flat&subject=bank` — рендер по
   пресету ({subject} в template; negative если движок поддерживает).
   Взаимоисключение: либо `style+subject`, либо сырой `prompt` (422 на смесь
   и на unknown style). `GET /image/styles` → `{styles: [{id, version}], …}`.
3. **Кэш-ключ style-пути**: sha256(style|version|subject|engine|size|seed) —
   бамп version = новые картинки, старый кэш не мешает.
4. **Seed-политика** `seed: subject` — детерминированный int из sha256(subject)
   (НЕ python hash() — он рандомизирован между процессами).
5. Тесты (fake-движок): style-рендер детерминирован; смена version меняет
   кэш-ключ; unknown style/смесь параметров = 422; seed-от-subject стабилен
   между вызовами; styles-эндпоинт.
6. README/OWNERSHIP: секция «Стили», канон «производное в кэш».

# Что НЕ делаем

- Прогрев/бэкфилл (зона learn-BFF, параллельный бриф learn-image-warmer).
- Художественный подбор шаблона word-flat: стартуем с проверенного
  architect'ом промпта (выше) — финальный вкус утвердит учитель/user
  по пробникам, тогда бампнем version.

# Acceptance

pytest+ruff зелёные; live: `render?style=word-flat&subject=bank` дважды →
одинаковый ETag (кэш-hit); `subject=tired` → другая картинка.
