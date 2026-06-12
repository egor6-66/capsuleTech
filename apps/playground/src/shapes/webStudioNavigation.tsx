/**
 * WebStudioNavigation — batch-shape студийной навигации (по образцу Shapes.ShellNavigation).
 *
 * Двухфазная форма (ADR 036):
 *  - bind (arg1): schema (`zod.array({ label, to })`) + контейнер `ui.Group` (вертикальный side-nav).
 *  - config (arg2): `item: { use: ui.Button as ui.Link, props }` + defaults + orientation/variant.
 *
 * Активный пункт (`aria-current=page` от TanStack Router) подсвечивается акцентом.
 * Глобал `Shapes.WebStudioNavigation`. Mount — `Widgets.Studio.Navigation` (rightBar студии).
 */
const WebStudioNavigation = Shape(
  (ui, { zod }) => ({
    schema: zod.array(zod.object({ label: zod.string(), to: zod.string() })),
    as: ui.Group,
  }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (it) => ({
        as: ui.Link,
        to: it.to,
        variant: 'outline',
        // Активный link несёт aria-current='page' → подсветка аксентом,
        // pointer-events-none блокирует повторный клик/hover-flicker.
        class:
          'w-full justify-start aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [
      { label: 'UI', to: '/workspace/web-studio/design' },
      { label: 'Logic', to: '/workspace/web-studio/logic' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default WebStudioNavigation;
