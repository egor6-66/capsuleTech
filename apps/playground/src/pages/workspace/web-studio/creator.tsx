// Creator — tree-centric сборка (бриф studio-creator-tree-iter1 §0):
//   sidebar  — дерево композиции = ГЛАВНАЯ поверхность редактирования; вставка
//              компонента кликом по мини-палитре внутри узла (отдельной палитры-
//              колонки нет — она осталась только в store-режиме).
//   main     — канвас = немая проекция document'а (read-only).
//   rightBar — при select узла дерева: props (Inspector) сверху + contract/readme
//              (Info) снизу — единый flow по `useDocument().selectedNode()`.
//   footer   — profiler (Monitoring).
const Creator = Page((Ui) => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Widgets.Studio.Tree />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      main: {
        children: <WebStudio.Canvas />,
        swapGroup: 'widgets',
      },
      rightBar: {
        children: <Widgets.Studio.Inspector />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
      footer: {
        children: <Widgets.Studio.Info />,
        swapGroup: 'widgets',
        initialSize: 0.25,
      },
    }}
  />
));

export default Creator;
