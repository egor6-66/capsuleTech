export type Layer = 'pages' | 'views' | 'controllers' | 'features' | 'widgets' | 'shapes';

export const LAYER_LABELS: Record<Layer, string> = {
  pages: 'Page',
  views: 'View',
  controllers: 'Controller',
  features: 'Feature',
  widgets: 'Widget',
  shapes: 'Shape',
};

/**
 * Curated double-width эмодзи без VS16 (см. `src/cli/tui/icons.ts` про политику).
 * Заменены `🎛`, `⚡`, `🔷` — все default-text, ломают ширину.
 */
export const LAYER_ICONS: Record<Layer, string> = {
  pages: '📄',
  views: '🧱',
  controllers: '🎮',
  features: '🪄',
  widgets: '🧰',
  shapes: '🟦',
};

export const layerTemplates: Record<Layer, (Name: string) => string> = {
  pages: (Name) => `const ${Name} = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen items-center justify-center">
    <div>${Name}</div>
  </Ui.Layout.Flex>
));

export default ${Name};
`,

  views: (Name) => `const ${Name} = View(({ Button }) => (
  <Button meta={{ tags: ['click'] }}>${Name}</Button>
));

export default ${Name};
`,

  controllers: (Name) => `const ${Name} = Controller(() => ({
  initial: 'idle',
  states: {
    idle: {},
  },
}));

export default ${Name};
`,

  features: (Name) => `const ${Name} = Feature((_services) => ({
  initial: 'idle',
  states: {
    idle: {},
  },
}));

export default ${Name};
`,

  widgets: (Name) => `const ${Name} = Widget((Ui) => (
  <div>${Name}</div>
));

export default ${Name};
`,

  shapes: (Name) => `const ${Name} = Shape(
  (ui) => ({
    schema: Zod.array(Zod.object({})),
    as: ui.Group,
  }),
  (ui) => ({
    item: {
      use: ui.Button,
      props: (it) => ({ children: '' }),
    },
  }),
);

export default ${Name};
`,
};
