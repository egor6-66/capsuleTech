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
  (_ui, { zod }) => ({
    schema: zod.array(
      zod.object({ label: zod.string(), to: zod.string(), can: zod.string().optional() }),
    ),
    as: Shell.Header.Navigation,
  }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (it) => ({
        as: ui.Link,
        to: it.to,
        variant: 'ghost',
        // Активный link несёт aria-current='page' → подсветка аксентом,
        // pointer-events-none блокирует повторный клик/hover-flicker.
        class:
          'aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [
      // Web Studio — дом креатор-кита (редакторы/тулзы), роль designer.
      // Ведёт на дефолтный workspace (design); layout-роут /web-studio оборачивает его.
      { label: 'Web Studio', to: '/workspace/web-studio', can: 'studio' },
      // DevOps — плейсхолдер, роль devops.
      { label: 'DevOps', to: '/workspace/devops', can: 'devops' },
      // Docs — доступна ВСЕМ (без `can`).
      { label: 'Docs', to: '/workspace/docs' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default ShellNavigation;
