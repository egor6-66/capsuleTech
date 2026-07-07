/**
 * /web-studio — SECTION-layout студии (зеркало learn `library/index.tsx`).
 *
 * Тонкий каркас раздела: под-навигация store/creator (`WebStudio.Navigation` в generic
 * `Widgets.Navigation`) + `<Ui.Outlet/>` под листья (store/creator); `_index` = welcome.
 * Матрица с панелями студии живёт в ЛИСТЬЯХ (store.tsx/creator.tsx), не тут.
 *
 * `WebStudio.Navigation` эмитит `onNavigate` (segment) — app-wide, автобабблится
 * в root `Features.App` → `router.goTo('/web-studio/<segment>')`. Домен-специфики
 * у раздела пока нет → доменную фичу-сток не заводим (не плодим пустышку).
 *
 * `meta.can: 'studio'` — гейт роли designer (developer видит всё).
 */
const WebStudioLayout = Page((Ui) => (
  <Ui.Layout.Flex orientation={'vertical'} w={'full'} h={'full'}>
    <Widgets.Navigation>
      <WebStudio.Navigation />
    </Widgets.Navigation>
    <Ui.Separator />
    <Ui.Layout.Flex h={'full'} w={'full'}>
      <Ui.Outlet />
    </Ui.Layout.Flex>
  </Ui.Layout.Flex>
));
export const meta = { can: 'studio' };

export default WebStudioLayout;
