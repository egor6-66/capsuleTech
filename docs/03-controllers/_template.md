---
tags: [hca, controller, registry]
status: documented
---

# 🟩 Controllers — реестр

> [!info]
> По одной странице на каждый Controller. Имя файла: `<group>-<name>.md`.

## Реестр

> [!todo]
> Сейчас в `apps/sandbox/src/controllers/universal/`:
> - `form.tsx` — Controller.Universal.Form (заготовка)
> - `list.tsx` — Controller.Universal.List (пустая FSM)
> - `validator.tsx` — Controller.Universal.Validator (демонстрация `next()`)

## Шаблон карточки

```markdown
---
tags: [hca, controller, <group>]
status: documented
group: <group>
file: apps/<app>/src/controllers/<group>/<name>.tsx
---

# Controller.<Group>.<Name>

## Назначение
Одно предложение.

## FSM
| Стейт | Хэндлеры | Переходы |
|---|---|---|
| `idle` | `onClick`, `onInput` | → `submitting` |
| `submitting` | `onInit` | → `idle` |

## Перехват по тегам
| Тег | Метод | Что делает |
|---|---|---|
| `submit` | `onClick` | вызывает `next(store.ctx.data)` |
| `@inputs` | `onInput` | мержит значение в store |

## next()
Делегирует наверх метод `<methodName>` (или ремап через [[overrides]]).

## Compliance
- [ ] Нет импортов других Controller
- [ ] Нет `fetch`/API-вызовов (это во Feature)
- [ ] Не знает имени тегов конкретной Entity

## Связанное
- [[02-entities/_template|Entities, с которыми работает]]
- [[04-features/_template|Feature, в которую делегирует]]
- [[controller-proxy]]
```
