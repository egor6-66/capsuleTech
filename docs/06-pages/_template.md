---
tags: [hca, page, registry]
status: documented
---

# 🟥 Pages — реестр

> [!info]
> По одной странице на каждую Page. Имя файла: `<route-as-slug>.md`.
>
> Папка `apps/<app>/src/pages/` зеркалится плагином [[vite-plugins#RouterPlugin|RouterPlugin]] → `.capsule/routes/`. Структура папок = структура роутов.

## Реестр

> [!todo]
> Сейчас в `apps/sandbox/src/pages/`:
> - `auth/login.tsx` — Page для роута `/auth/login`
>
> ⚠️ Рядом лежит `login.jsx` — дубликат, кандидат на удаление.

## Шаблон карточки

```markdown
---
tags: [hca, page]
status: documented
route: /<path>
file: apps/<app>/src/pages/<path>.tsx
---

# Page.<Name>

## Роут
`/<path>`

## Слоты Layout
| Слот | Что |
|---|---|
| `main` | основной контент |
| `header` | (опционально) |

## Композиция
```jsx
<Layout variant="centroid" slots={{ main: <Widgets.<Group>.<Name> /> }} />
```

## Связанное
- [[05-widgets/_template]]
- [[vite-plugins]]
```
