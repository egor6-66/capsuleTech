/**
 * Navigation — batch-shape для основной навигации Nexus.
 *
 * Schema: `z.array({ label, to })` — массив роут-пунктов.
 * Defaults: единственная активная страница workspace — `/workspace/dashboard`.
 * (По мере появления новых страниц — добавлять сюда; `/workspace` пока пустой
 * landing под будущее лого.)
 *
 * Template (`as`): `ui.Group` — batch-контейнер от UI-kit. Group итерирует сам,
 * на каждый элемент рендерит `item.use` с `item.props(it)`.
 * Items рендерятся через `ui.Button as={ui.Link}` — Button-стили на TanStack
 * `Link` → кликабельная навигационная кнопка, ходит через router (не reload).
 *
 * Mount-сайт — `Widgets.Header`.
 */
const Navigation = Shape(
  (ui, { zod }) => ({
    schema: zod.array(
      zod.object({
        label: zod.string(),
        to: zod.string(),
      }),
    ),
    as: ui.Group,
  }),
  (ui, props) => ({
    item: {
      use: ui.Button,
      props: (it) => ({
        as: ui.Link,
        to: it.to,
        variant: 'outline',
        // Активный link получает aria-current='page' от TanStack Router — на этом
        // селекторе подсвечиваем кнопку аксентом, чтобы было видно где находишься.
        class:
          'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [{ label: 'Dashboard', to: '/workspace/dashboard' }],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default Navigation;
