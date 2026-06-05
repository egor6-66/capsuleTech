const ShellNavigation = Shape((z, ui) => ({
  schema: z.array(
    z.object({
      label: z.string(),
      to: z.string(),
    }),
  ),
  defaults: [
    { label: 'Dashboard', to: '/workspace/dashboard' },
    { label: 'Cards', to: '/workspace/cards' },
    { label: 'Map', to: '/workspace/map' },
    { label: 'Reports', to: '/workspace/reports' },
  ],
  as: Shell.Header.Navigation,
  itemAs: ui.Button,
  itemProps: (item: { label: string; to: string }) => ({
    as: ui.Link,
    to: item.to,
    variant: 'outline',
    // Активный link получает aria-current='page' от TanStack Router — на этом
    // селекторе подсвечиваем кнопку аксентом, чтобы было видно где находишься.
    // `font-semibold` усиливает читаемость; `pointer-events-none` блокирует
    // повторный клик/hover-flicker на текущей странице. Сам hover/active
    // transition наследуется от Button base (`duration-fast` = 200ms).
    class:
      'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
    children: item.label,
  }),
  orientation: 'horizontal',
  variant: 'attached',
}));

export default ShellNavigation;
