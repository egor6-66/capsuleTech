---
tags: [hca, entity, registry]
status: documented
---

# 🟦 Entities — реестр

> [!info]
> Здесь живёт по одной странице на каждую Entity. Файл-шаблон ниже. Имя файла = `<group>-<name>.md`.

## Реестр

> [!todo]
> Заполнить по мере добавления Entity. Пока в коде:
> - `apps/sandbox/src/entities/viewer/loginForm.tsx` — пустой файл, требует реализации.

## Шаблон карточки

```markdown
---
tags: [hca, entity, <group>]
status: documented
group: <group>
file: apps/<app>/src/entities/<group>/<name>.tsx
---

# Entity.<Group>.<Name>

## Назначение
Одно предложение.

## Принимает (props)
| Prop | Тип | Зачем |
|---|---|---|
| `meta` | `{ tags: string[] }` | мета-теги для перехвата UiProxy |

## Внутренние слоты UI
| Слот | Откуда | Назначение |
|---|---|---|
| `Field`, `Field.Label`, `Field.Content` | UiProxy | поля формы |
| `Input` | UiProxy | поле ввода |
| `Button` | UiProxy | кнопки действий |

## Meta-теги
| Тег | Где | Перехватывает |
|---|---|---|
| `submit` | `<Button>` | [[03-controllers/_template\|Controller.Form]] |
| `email`, `@inputs` | `<Input>` | [[03-controllers/_template\|Controller.Form]] |

## Compliance
- [ ] No upward imports
- [ ] No horizontal imports (нет `<OtherEntity />` в JSX)
- [ ] Stateless (нет `createSignal` для бизнес-логики)
- [ ] Нет `import` кроме Solid и типов

## Связанное
- [[ui-proxy]]
- [[03-controllers/_template|Controllers, которые работают с этой Entity]]
```

## Связанное

- [[layers#🟦 Entity — Stateless UI|Слои → Entity]]
- [[golden-rules]]
