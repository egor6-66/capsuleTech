---
title: Foundation 06 — apps/learn/ scaffold (thin client, HCA layers, lang module hardcoded на MVP)
status: ready
audience: app agent (commit-only, без push)
last_updated: 2026-06-20
depends_on: [foundation-04, foundation-05]
unlocks: []
adr_refs: [055]
---

# Контекст

ADR 055 D6: `apps/learn/` — тонкий клиент. Только View/Widget/Page (+ минимум Features для навигации). Никаких Entity/Shape/Controller для domain-логики обучения — она на бэке. На MVP — module-селектор отсутствует, `lang` hardcoded.

Этот бриф — **scaffold app'а** и сборка первого layout'а из stub-блоков `Learn.*`. Реальная интеграция с backend (`web-query` endpoints) — последующий PR.

# Scope

Создать `apps/learn/` через `capsule create-app`, собрать pages (home / concept / exercise) из `Learn.*` stub-компонентов. Должна корректно собираться и рендериться.

Работа **напрямую в `main`**. Без ветки. Commit-only **без push**.

# Шаги

## 1. Create app

```bash
cd apps && pnpm capsule create-app learn
# или эквивалентный CLI-сценарий
```

Результат — стандартный capsule app в `apps/learn/`:
- `capsule.app.ts` / `capsule.config.ts`
- `package.json` / `tsconfig.json`
- `src/{entities,features,controllers,shapes,views,widgets,pages}/`
- `public/`

## 2. Подключить `@capsuletech/web-learn`

В `apps/learn/package.json`:
```jsonc
"dependencies": {
  "@capsuletech/web-learn": "workspace:*"
}
```

В `apps/learn/capsule.app.ts` — register module:
```ts
import LearnModule from '@capsuletech/web-learn/capsule';

export default defineCapsuleApp({
  modules: [LearnModule],
  // ...
});
```

## 3. Pages

`src/pages/index.tsx` (home — catalog):
```tsx
const Home = Page((Ui) => {
  return (
    <Ui.Flex direction="column" gap="md">
      <Ui.Typography variant="h1">Learn (lang) — concepts</Ui.Typography>
      <Learn.Progress concepts={[]} />
      <Ui.List>
        {/* TODO: when backend integration ready — load from /learn/lang/lessons */}
        <Ui.List.Item>
          <Ui.Typography>Articles: a vs the</Ui.Typography>
        </Ui.List.Item>
      </Ui.List>
    </Ui.Flex>
  );
});

export default Home;
```

`src/pages/concept/[id].tsx`:
```tsx
const ConceptPage = Page((Ui, props) => {
  return (
    <Ui.Flex direction="column" gap="md">
      <Learn.LessonView conceptId={props.params.id} />
    </Ui.Flex>
  );
});

export default ConceptPage;
```

`src/pages/exercise/[id].tsx`:
```tsx
const ExercisePage = Page((Ui, props) => {
  return (
    <Ui.Flex direction="column" gap="md">
      <Learn.Exercise type="fill-blank" />
    </Ui.Flex>
  );
});

export default ExercisePage;
```

## 4. `capsule.config.ts`

Никакой specific конфигурации на MVP — стандартный шаблон. На будущее (когда заведём бэк-интеграцию) в `defineAppConfig` (ADR 013) добавится `learnApiUrl` — пока не нужно.

## 5. `.gitignore`

`apps/learn/` — это **трекаемый** app (в отличие от `apps/sandbox/` / `apps/playground/` локальных). Убедиться что не попадает под `.gitignore`-правила для local sandbox apps.

## 6. README

Короткий README — описание, как запустить (`cd apps/learn && pnpm dev`), почему этот app — тонкий клиент (ссылка на ADR 055).

# Acceptance

- `cd apps/learn && pnpm dev` — поднимается Vite, открывается `/` (home).
- На страницах видны stub'ы `Learn.*` (надписи "LessonView stub", "Exercise stub", "Progress stub" и т.д.).
- `pnpm capsule build` — успешно.
- TypeScript clean: `pnpm tsc --noEmit` в apps/learn.
- `compliance:check` — clean (нет structural-нарушений).
- Все импорты `Learn.*` идут как **globals**, а не explicit imports (memory `feedback_no_imports_in_app` — apps используют globals).

# Что НЕ делаем

- Backend integration через `web-query` endpoints — НЕТ. UI работает на стат.данных и заглушках. Реальные вызовы `/learn/lang/lessons` и т.д. — отдельным PR после foundation смержен и стабилизирован.
- Voice integration (Speak-кнопка через `@capsuletech/web-voice`) — НЕТ. `web-voice` пакет в foundation-серии не делается; добавится отдельным брифом.
- Module-селектор (выбор lang/guides) — НЕТ на MVP.
- Auth / login — НЕТ.
- Storybook / e2e тесты — НЕТ.
- Кастомная тема / styling — стандартная (`web-style`).

# Дальше

Когда все foundation 01..06 смержены — мы получаем **первый связанный стек** (даже если UI пустой):

- `apps/learn/` рендерится
- `packages/web/learn/` поставляет stub-компоненты как globals
- `backend/learn/` (если запустить) отвечает на /modules, /lang/lessons mock-ответами
- `backend/lang/` + `backend/voice/` отвечают на свои эндпоинты mock'ами
- `packages/shared/data/py` — БД и storage абстракции готовы для consumer'ов

Следующая серия PR'ов — заполнение реальной логики, по приоритету.
