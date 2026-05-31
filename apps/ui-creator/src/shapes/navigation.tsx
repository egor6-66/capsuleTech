/**
 * Navigation — batch-shape основной навигации UI-creator.
 *
 * Schema: `z.array({ label, to })`. Defaults — рабочие роуты воркспейса.
 * Template (`as`): `ui.Group` (attached) с `ui.Button as={ui.Link}` на пункт —
 * кликабельная кнопка, ходит через router. Активный пункт (`aria-current=page`
 * от TanStack) подсвечивается акцентом.
 *
 * Глобал `Shapes.Navigation`. Mount — `Widgets.Header` (workspace header).
 */
const Navigation = Shape((z, ui) => ({
  schema: z.array(
    z.object({
      label: z.string(),
      to: z.string(),
    }),
  ),
  defaults: [
    { label: 'Конструктор', to: '/workspace/constructor' },
    { label: 'Демо', to: '/workspace/demo' },
  ],
  as: ui.Group,
  itemAs: ui.Button,
  itemProps: (item: { label: string; to: string }) => ({
    as: ui.Link,
    to: item.to,
    variant: 'outline',
    class:
      'aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold aria-[current=page]:pointer-events-none',
    children: item.label,
  }),
  orientation: 'horizontal',
  variant: 'attached',
}));

export default Navigation;
