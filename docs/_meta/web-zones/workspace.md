---
title: web-zone-workspace
description: Canon для zone `workspace` — каталог апп-хостов capsule (studio + learn + общий web-workspace). UX-единый класс мощных приложений; source of truth о scope, import-правилах, designated-shared.
status: canon
last_updated: 2026-07-05
tags: [meta, web-zones, workspace]
---

# Zone: workspace

> Физическая директория: `packages/web/workspace/` (6-я top-level zone, [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] **Amendment D7**).
>
> Заменяет плоскую sole-inhabitant зону `studio` (D6) и впервые вводит `learn` в канон зон (раньше — слепое пятно, `classifyZone` → null).

## Purpose {#purpose}

**Каталог апп-хостов — мощных, широких по возможностям приложений capsule.** studio (design-time конструктор) и learn (обучающий апп) — оба «апп-как-пакет» с богатым UX. Мандат user (2026-07-05): **их интерфейс и механики максимально одинаковы** — юзер, привыкший к одному, работает в другом привычным способом; меняется только смысл/контент, «мехи те же». Общие механики (палитра, панели, навигация, шелл) живут в общем пакете `web-workspace`, который оба потребляют.

Сюда же складываются будущие похожие апп-хосты.

## Packages {#packages}

| Package | npm | Ярус | One-line |
|---|---|---|---|
| `studio` | `@capsuletech/web-studio` | app-хост | Design-time host/composer (editor + palette + inspector + canvas). |
| `learn` | `@capsuletech/web-learn` | app-хост | Обучающий апп (library / lessons / guides / progress). |
| `kit` | `@capsuletech/web-workspace` | shared | Общий шелл механик апп-хостов (палитра первой; дальше панели/навигация). **Скаффолдится следующим шагом.** |

## Import rules {#import-rules}

Зона потребляет всё нижнее (наследует host-привилегии студии):
```
workspace → kit | runtime | boost | domain (можно)
workspace → web-contract (можно)
apps ↛ workspace в prod вне регистрации ADR 033
```

**Intra-zone канон (жёсткий, ADR 047 D7):** два яруса — shared (`web-workspace`) и app-хосты (`web-studio`, `web-learn`).
```
web-studio  ⊥ web-learn        ← ЗАПРЕЩЕНО (app не пускает корни в соседа)
web-studio  → web-workspace    ← можно (designated shared)
web-learn   → web-workspace    ← можно
web-workspace ↛ web-studio/learn ← запрещено (shared потребителей не знает)
```
Причина: модули живут в **пакете**, не в аппе → их можно комбинировать между аппами, но сами апп-пакеты остаются развязаны. Строже, чем loose same-zone у boost: cross-package разрешён **только** если цель = `web-workspace`. Enforced в `compliance/zones.ts` (`isZoneImportAllowed` спец-кейс).

## Canonical shape {#canonical-shape}

```
packages/web/workspace/
  studio/    @capsuletech/web-studio     ← app-хост (детали: docs/_meta/studio.md)
  learn/     @capsuletech/web-learn      ← app-хост
  kit/       @capsuletech/web-workspace  ← общий шелл (palette → panels → nav)
```

## Non-goals {#non-goals}

- ❌ app-хосты импортят друг друга. Общее — только через `web-workspace`.
- ❌ `web-workspace` знает о конкретном app-хосте (shared ↛ app).
- ❌ Свой UI-kit / runtime. Chrome на `@capsuletech/web-ui`, механика поверх runtime.

## Related {#related}

- [[web-zone-kit]], [[web-zone-runtime]], [[web-zone-boost]], [[web-zone-domain]] — workspace может читать любую.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D6 + **D7** — studio flatten → workspace catalog + learn в каноне.
- `docs/_meta/studio.md` — AI-anchor пакета studio (subpaths, composition rule).
