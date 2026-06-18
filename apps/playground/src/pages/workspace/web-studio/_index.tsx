/**
 * /workspace/web-studio — welcome (index fallback).
 *
 * Рендерится в `<Ui.Outlet/>` layout'а студии, когда юзер на голом
 * `/workspace/web-studio` без дочернего матча. Конвенция роутера: `_index.tsx`
 * рядом с `index.tsx` (layout) → router-плагин эмитит index-роут с этим
 * компонентом вместо null-stub.
 *
 * Навигация по разделам студии — через `Widgets.Studio.Header.SectionNav` выше
 * в layout-слоте. Welcome — чисто информационный.
 *
 * Доступ уже гейтится layout'ом (`meta.can: 'studio'`) — здесь meta не нужно.
 */
const Welcome = Page((Ui) => (
  <Ui.Layout.Flex
    orientation="vertical"
    align="center"
    justify="center"
    gapY={8}
    h="full"
    class="p-12"
  >
    <Ui.Layout.Flex orientation="vertical" gapY={4} align="center" maxW={160}>
      <Ui.Typography variant="h1" size="4xl" align="center">
        Web Studio
      </Ui.Typography>
      <Ui.Typography tone="muted" size="lg" align="center">
        Рабочее пространство для проектирования. Композитор manifest'ов компонентов, операций над
        JSON-деревом, inspector'а пропсов и DnD-сборки. Инструменты web devOps и performance
        monitor.
      </Ui.Typography>
    </Ui.Layout.Flex>

    <Ui.Layout.Flex orientation="horizontal" gapX={4} justify="center" maxW={200}>
      <Ui.Card>
        <Ui.Card.Header>
          <Ui.Card.Title>Store</Ui.Card.Title>
          <Ui.Card.Description>
            Холст с палитрой компонентов, инспектором настроек и панелью контракта. Точка входа для
            сборки нового компонента из примитивов.
          </Ui.Card.Description>
        </Ui.Card.Header>
      </Ui.Card>

      <Ui.Card>
        <Ui.Card.Header>
          <Ui.Card.Title>Creator</Ui.Card.Title>
          <Ui.Card.Description>
            Procedural-генераторы UI-деревьев из preset'ов. Раздел в разработке.
          </Ui.Card.Description>
        </Ui.Card.Header>
      </Ui.Card>
    </Ui.Layout.Flex>

    <Ui.Typography tone="muted" size="sm">
      Выберите раздел в навигации выше.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Welcome;
