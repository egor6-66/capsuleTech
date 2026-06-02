/**
 * Navigation — batch-shape для основной навигации Nexus.
 *
 * Schema: `z.array({ label, to })` — массив роут-пунктов.
 * Defaults: единственная активная страница workspace — `/workspace/dashboard`.
 * (По мере появления новых страниц — добавлять сюда; `/workspace` пока пустой
 * landing под будущее лого.)
 *
 * Template (`as`): `ui.Group` — batch-контейнер от UI-kit. Group итерирует сам:
 * `<Dynamic component={itemAs} {...itemProps(item)} />` на каждый элемент.
 * Items рендерятся через `ui.Button as={ui.Link}` — Button-стили на TanStack
 * `Link` → кликабельная навигационная кнопка, ходит через router (не reload).
 *
 * Mount-сайт — `Widgets.Header`.
 */
const Navigation = Shape((z, ui) => ({
  schema: z.array(
    z.object({
      label: z.string(),
      to: z.string(),
    }),
  ),
  defaults: [{ label: 'Dashboard', to: '/workspace/dashboard' }],
  as: ui.Group,
  itemAs: ui.Button,
  itemProps: (item: { label: string; to: string }) => ({
    as: ui.Link,
    to: item.to,
    variant: 'outline',
    // Активный link получает aria-current='page' от TanStack Router — на этом
    // селекторе подсвечиваем кнопку аксентом, чтобы было видно где находишься.
    class:
      'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
    children: item.label,
  }),
  orientation: 'horizontal',
  variant: 'attached',
}));

export default Navigation;
