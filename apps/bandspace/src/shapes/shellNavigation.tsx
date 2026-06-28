/**
 * ShellNavigation — основная навигация шелла (батч-shape, по образцу playground).
 *
 * Двухфазная форма (ADR 036): bind = schema + контейнер `Shell.Header.Navigation`;
 * config = item-рендер (`Button as Link`) + defaults (разделы) + orientation/variant.
 * Активный пункт — `aria-current=page` от TanStack Router → подсветка аксентом.
 */
const ShellNavigation = Shape(
  (_ui, { zod }) => ({
    schema: zod.array(zod.object({ label: zod.string(), to: zod.string() })),
    as: Shell.Header.Navigation,
  }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (it) => ({
        as: ui.Link,
        to: it.to,
        variant: 'ghost',
        class:
          'aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [
      { label: 'Треки', to: '/board/tracks' },
      { label: 'Календарь репетиций', to: '/board/calendar' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default ShellNavigation;
