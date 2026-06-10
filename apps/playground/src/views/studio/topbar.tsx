/**
 * Studio.Topbar — верхний бар студии (stateless хром на web-ui).
 *  - слева: рейл-тоггл (заглушка) + breadcrumb subject (заглушка).
 *  - центр: workspace-switcher → дочерние роуты design/logic/monitor (router, aria-current подсветка).
 *  - справа: lens-сегмент (Design) — meta-tagged, событие в Controllers.Studio; ⌘K (заглушка).
 *
 * Активный lens читается из Controller через `useCtx().store.ctx.data.lens`.
 */
const Topbar = View((Ui) => {
  const ctx = useCtx();
  const lens = (): string => (ctx.store.ctx.data?.lens as string) ?? 'ui';

  const Lens = (id: string, label: string) => (
    <Ui.Button variant={lens() === id ? 'default' : 'ghost'} meta={{ tags: ['lens', id] }}>
      {label}
    </Ui.Button>
  );

  const Tab = (to: string, label: string) => (
    <Ui.Button
      as={Ui.Link}
      to={to}
      variant="outline"
      class="aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground aria-[current=page]:font-semibold"
    >
      {label}
    </Ui.Button>
  );

  return (
    <Ui.Layout.Flex class="items-center justify-between gap-cell border-b border-border px-cell py-tight">
      <Ui.Layout.Flex class="items-center gap-tight">
        <Ui.Typography variant="muted" class="text-sm">
          App › Studio
        </Ui.Typography>
      </Ui.Layout.Flex>

      <Ui.Layout.Flex class="items-center gap-tight">
        {Tab('/workspace/web-studio/design', 'Design')}
        {Tab('/workspace/web-studio/logic', 'Logic')}
        {Tab('/workspace/web-studio/monitor', 'Monitor')}
      </Ui.Layout.Flex>

      <Ui.Layout.Flex class="items-center gap-tight">
        {Lens('ui', 'UI')}
        {Lens('style', 'Style')}
        {Lens('text', 'Text')}
        {Lens('data', 'Data')}
        <Ui.Button variant="ghost" class="font-mono text-xs">
          ⌘K
        </Ui.Button>
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  );
});

export default Topbar;
