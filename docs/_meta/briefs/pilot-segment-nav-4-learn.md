# Brief 4/4 — learn: снести Nav×3 + Welcome×3, регистрировать shell-блоки (scope `learn`)

**Пилот дедупа Nav/Welcome (канон [[feedback_product_wide_kit_layering]]).** learn = app-host пакет: **ноль своего UI/мехов/классов**, только данные (segments) + композиция + регистрация. Ждёт brief 3 (web-shell `SegmentNav`/`Launcher`).

## Удалить (буквальные копии — визуал уехал в web-ui/web-shell)
- `src/lessons/Nav.tsx` · `src/library/Navigation.tsx` (Nav×2, +studio будет 3-й)
- `src/welcome/Welcome.tsx` · `src/lessons/LessonsWelcome.tsx` · `src/library/LibraryWelcome.tsx` (Welcome×3)
- Их `types.ts`/локальные event-интерфейсы, ставшие ненужными.

## Сохранить (это ДАННЫЕ, не UI)
- `segments.ts` во всех трёх местах (`LEARN_SEGMENTS`/`LESSONS_SEGMENTS`/`LIBRARY_SEGMENTS`) — контракт `{id,label,description?}` уже совпадает с web-ui `ISegmentedBarItem`/`ILauncherItem`.

## Регистрация в `src/capsule.ts` (композиция = разрешена, это НЕ «свой UI»)
Импорт из web-shell (workspace→domain разрешён зоной):
```ts
import { SegmentNav, Launcher } from '@capsuletech/web-shell/ui';
import { LEARN_SEGMENTS } from './welcome/segments';
import { LESSONS_SEGMENTS } from './lessons/segments';
import { LIBRARY_SEGMENTS } from './library/segments';

// тонкие data-биндинги (не UI — композиция готового блока с данными зоны):
const LibraryNav = () => <SegmentNav segments={LIBRARY_SEGMENTS} nav="library" />;
const LessonsNav = () => <SegmentNav segments={LESSONS_SEGMENTS} nav="lessons" />;
const Welcome = () => <Launcher segments={LEARN_SEGMENTS} nav="root" title="..." description="..." hint="..." />;
const LessonsWelcome = () => <Launcher segments={LESSONS_SEGMENTS} nav="lessons" title="Lessons" .../>;
const LibraryWelcome = () => <Launcher segments={LIBRARY_SEGMENTS} nav="library" .../>;
```
Ключи глобалов `Learn.*` НЕ меняем (`LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome`) — апп продолжает звать те же `Learn.*`. Меняется только источник (shell-блок) и событие.

## Анатомия (по ходу, канон learn=эталон)
Раз welcome/-компонент ушёл — папка `welcome/` схлопывается до `welcome/segments.ts` (данные). Это первый шаг «пакет = данные+композиция». Полную перекладку (`core/`+`modules/`) НЕ делаем в этом брифе — отдельно.

## Verify
`nx run @capsuletech/web-learn:test --skip-nx-cache` + `:typecheck` + `:build`. Тесты снесённых компонентов удалить/перенести. **Ноль сырых классов в learn после этого.**

## ⚠️ Follow-up (НЕ этот scope) — apps-learn
`Features.App` в apps/learn ловит сейчас `onLibraryNavigate`/`onLessonsNavigate`/`onNavigate` → консолидировать в один хэндлер `onSegmentNavigate` (различает по `payload.nav`, делает `router.goTo`). Отдельный мини-бриф owner apps-learn (architect напишет после мержа пакетов). До него живой app-роутинг nav может не работать — это ожидаемо, интеграция последним тактом.
