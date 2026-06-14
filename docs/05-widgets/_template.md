---
tags: [hca, widget, registry]
status: documented
last_updated: 2026-06-13
---

# 🟪 Widgets — реестр

> [!info]
> По одной странице на каждый Widget. Имя файла: `<group>-<name>.md`.

## Реестр

> [!todo]
> Сейчас в `apps/sandbox/src/widgets/`:
> - `forms/auth.tsx` — Widget.Forms.Auth (заглушка)
> - `lists/base.tsx` — Widget.Lists.Base (заглушка)
>
> ⚠️ Рядом лежат `.jsx`-дубликаты — кандидаты на удаление.

## Шаблон карточки

```markdown
---
tags: [hca, widget, <group>]
status: documented
group: <group>
file: apps/<app>/src/widgets/<group>/<name>.tsx
---

# Widget.<Group>.<Name>

## Назначение
Что эта композиция представляет пользователю.

## Дерево композиции
```jsx
<Features.<...>>
  <Controllers.<...> overrides={{ onClick: '<targetMethod>' }}>
    <Card>
      <Card.Content>
        <Entities.<...> />
      </Card.Content>
    </Card>
  </Controllers.<...>>
</Features.<...>>
```

## Используемые слоты UI
| Слот | Назначение |
|---|---|
| `Card`, `Card.Content` | контейнер |

## Compliance
- [ ] Нет бизнес-логики (никаких `if`/`fetch`)
- [ ] Только композиция

## Связанное
- [[02-entities/_template]]
- [[03-controllers/_template]]
- [[04-features/_template]]
```
