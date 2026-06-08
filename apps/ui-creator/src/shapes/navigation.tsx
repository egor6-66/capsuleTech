/**
 * Navigation — batch-shape основной навигации UI-creator.
 *
 * Двухфазная форма (ADR 036):
 *  - bind (arg1): schema (`zod.array({ label, to })`) + контейнер `ui.Group` (attached).
 *  - config (arg2): `item: { use: ui.Button, props }` (row-типизирован из schema)
 *    + defaults + orientation/variant контейнера.
 *
 * Активный пункт (`aria-current=page` от TanStack) подсвечивается акцентом.
 * Глобал `Shapes.Navigation`. Mount — `Widgets.Header` (workspace header).
 */
const Navigation = Shape(
  (ui, { zod }) => ({
    schema: zod.array(zod.object({ label: zod.string(), to: zod.string() })),
    as: ui.Group,
  }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (item) => ({
        as: ui.Link,
        to: item.to,
        variant: 'outline',
        class:
          'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: item.label,
      }),
    },
    defaults: [
      { label: 'Конструктор', to: '/workspace/constructor' },
      { label: 'Демо', to: '/workspace/demo' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default Navigation;
