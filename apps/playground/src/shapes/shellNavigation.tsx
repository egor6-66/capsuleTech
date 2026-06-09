/**
 * ShellNavigation — batch-shape основной навигации workspace (по образцу ewc).
 *
 * Двухфазная форма (ADR 036):
 *  - bind (arg1): schema (`zod.array({ label, to })`) + контейнер `Shell.Header.Navigation`.
 *  - config (arg2): `item: { use: ui.Button as ui.Link, props }` + defaults + orientation/variant.
 *
 * Активный пункт (`aria-current=page` от TanStack Router) подсвечивается акцентом.
 * Глобал `Shapes.ShellNavigation`. Mount — `Widgets.Header`.
 */
const ShellNavigation = Shape(
  (ui, { zod }) => ({
    schema: zod.array(zod.object({ label: zod.string(), to: zod.string() })),
    as: Shell.Header.Navigation,
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
          'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [
      { label: 'Routing', to: '/workspace/routing' },
      { label: 'Source', to: '/workspace/source' },
      { label: 'Builds', to: '/workspace/builds' },
      { label: 'DevOps', to: '/workspace/devops' },
      { label: 'Apps', to: '/workspace/apps' },
      { label: 'UI', to: '/workspace/ui' },
      { label: 'Logic', to: '/workspace/logic' },
      { label: 'Styles', to: '/workspace/styles' },
      { label: 'Words', to: '/workspace/words' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default ShellNavigation;
