const ShellNavigation = Shape(
  (ui) => ({
    schema: Zod.array(Zod.object({ label: Zod.string(), to: Zod.string() })),
    as: Shell.Header.Navigation,
  }),
  (ui, props) => ({
    child: {
      use: ui.Button,
      props: (it) => ({
        as: ui.Link,
        to: it.to,
        variant: 'outline',
        // Активный link получает aria-current='page' от TanStack Router — на этом
        // селекторе подсвечиваем кнопку аксентом, чтобы было видно где находишься.
        // `pointer-events-none` блокирует повторный клик/hover-flicker на текущей.
        class:
          'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
        children: it.label,
      }),
    },
    defaults: [
      { label: 'Dashboard', to: '/workspace/dashboard' },
      { label: 'Cards', to: '/workspace/cards' },
      { label: 'Map', to: '/workspace/map' },
      { label: 'Reports', to: '/workspace/reports' },
    ],
    orientation: 'horizontal',
    variant: 'attached',
  }),
);

export default ShellNavigation;
