/**
 * Конструктор (`/workspace/constructor`) — рабочий стол редактора UI.
 *
 * Тонкая композиция (ADR 032): вся механика редактора (state/dnd/подсветка/
 * оверлеи/рендер) живёт в `@capsuletech/studio`. App держит ТОЛЬКО layout.
 *
 *  - `<Editor.Provider kit={Ui}>` — параметризует редактор китом (что передали,
 *    тем и рисуем; редактор не привязан к реализациям). Внутри сам монтит
 *    `DnDProvider` + `Controllers.Editor` и провайдит dnd/ctx/kit детям-surface'ам.
 *    App про web-dnd/рендерер под капотом не знает.
 *  - Surface'ы (`Editor.Palette/Tree/Canvas/Inspector`) — глобалы из пакета
 *    (зарегистрированы через `/capsule`), читают kit/ctx/dnd сами.
 *
 * Каркас Matrix (preset app-shell): sidebar (Palette+Tree) | main (Canvas) | rightBar (Inspector).
 */

const Constructor = Page((Ui) => (
  <Editor.Provider kit={Ui}>
    <Ui.Layout.Matrix
      preset="app-shell"
      slots={{
        sidebar: {
          children: (
            <Ui.Layout.Flex
              orientation="vertical"
              withHandle
              class="h-full"
              items={[
                { children: <Editor.Palette />, resizable: true, initialSize: 0.5 },
                { children: <Editor.Tree />, resizable: true, initialSize: 0.5 },
              ]}
            />
          ),
          initialSize: 0.14,
          draggable: true,
        },
        main: {
          children: <Editor.Canvas />,
        },
        rightBar: {
          children: <Editor.Inspector />,
          initialSize: 0.14,
          draggable: true,
        },
      }}
    />
  </Editor.Provider>
));

export default Constructor;
