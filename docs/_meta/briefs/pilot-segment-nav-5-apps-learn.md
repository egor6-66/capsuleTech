# Brief 5/5 — apps-learn: консолидация nav-события (scope `apps-learn`)

**Финал пилота дедупа Nav/Welcome (канон [[feedback_product_wide_kit_layering]]).** Пакеты смержены (router/ui/shell/learn зелёные). Learn теперь эмитит ОДНО generic `onSegmentNavigate { nav, segment }` вместо трёх (`onNavigate`/`onLibraryNavigate`/`onLessonsNavigate`). Апп надо перепровести — иначе live-nav не роутит.

## Наблюдение: маппинг стал единым
Раньше 3 разных хендлера в 3 фичах давали по сути одну формулу:
```
nav='root'    (welcome)  → /${segment}
nav='library'            → /library/${segment}
nav='lessons'            → /lessons/${segment}
```
= `nav === 'root' ? `/${segment}` : `/${nav}/${segment}``. Событие стало **app-wide** (не domain-specific) → по канону [[feedback_app_feature_scopes]] переезжает в **root `Features.App`** (домен-специфики в маппинге больше нет).

## Правки

**`features/app.tsx`** — заменить `onNavigate` на единый:
```ts
// Навигация из любого SegmentNav/Launcher (welcome + под-навигации разделов).
// Событие app-wide: маппинг nav+segment → путь одинаков для всех.
onSegmentNavigate: ({ target }) => {
  const { nav, segment } = target.payload;
  router.goTo(nav === 'root' ? `/${segment}` : `/${nav}/${segment}`);
},
```
Тип Feature: `Feature<Shell.SegmentNav.Events>` (или добавить в существующий агрегат событий App).

**`features/library.tsx`** — удалить `onLibraryNavigate` (и `Learn.LibraryNav.Events` из generic'а Feature). Событие теперь бабблится в App. Оставить фичу как сток для будущих library-событий (или схлопнуть, если других нет — на твоё усмотрение).

**`features/lessons.tsx`** — удалить `onLessonsNavigate`. **Оставить** `onLessonSelect`/`onRuleSelect`/`onConceptSelect` (это domain-события раздела, не навигация-сегментами) — тип Feature обновить (убрать LessonsNav.Events, оставить остальные).

## Проверка бабблинга
`Features.App` — root-предок `Features.Library`/`Features.Lessons`. `onSegmentNavigate` из под-навигации раздела, не пойманное доменной фичей, автобабблится (HCA `next()`) до App → роутится единой формулой. Welcome (nav='root') под App напрямую. Один хендлер ловит все три источника.

## Verify (live — зона твоя, USER)
`capsule dev` в apps/learn → клик по welcome-карточке → раздел; клик по под-нав вкладке library/lessons → `/library|lessons/<segment>` + активная подсветка (derived из URL через `useActiveSegment`). Проверить оба уровня + F5 сохраняет активную вкладку.

**Это последний такт пилота** — после него дедуп Nav×3/Welcome×3 доказан end-to-end. Дальше тиражируем паттерн (списки, палитра) + studio под learn.
