/**
 * ShellNavigation — batch-shape основной навигации learn-workspace.
 *
 * Зеркало playground-навигации (единый UI/UX-флоу фича-аппов), смысл — learn-разделы.
 * Двухфазная форма (ADR 036): bind = schema + `Shell.Header.Navigation`; config = item
 * (`ui.Button as ui.Link`) + defaults. Без `can` — авторизации пока нет.
 *
 * Активный пункт (`aria-current=page`) подсвечивается акцентом. Глобал
 * `Shapes.ShellNavigation`, mount — `Widgets.Header`.
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
        children: it.label,
      }),
    },
    defaults: [
      { label: 'Lessons', to: '/lessons' },
      { label: 'Exercises', to: '/exercises' },
      { label: 'Progress', to: '/progress' },
      { label: 'Library', to: '/library' },
      { label: 'Guides', to: '/guides' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default ShellNavigation;
