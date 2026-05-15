const NavItems = Shape((z, ui) => ({
  schema: z.array(
    z.object({
      component: z.component(),
      href: z.string(),
    }),
  ),
  defaults: [
    { component: <span>Branches</span>, href: '/branches' },
    { component: <span>Apps</span>, href: '/apps' },
    { component: <span>Configs</span>, href: '/configs' },
  ],
  /**
   * Default template. `ui.Navigation.Item` — path-tracker, на render-этапе
   * Shape резолвит его в проксированный Ui.Navigation.Item родительского
   * Entity (с UiProxy event-binding'ом).
   */
  as: ui.Navigation.Item,
  props: (item) => ({
    meta: { tags: ['nav'] },
    payload: { href: item.href },
    children: item.component,
  }),
}));

export default NavItems;
