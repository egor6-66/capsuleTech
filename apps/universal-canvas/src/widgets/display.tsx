import { createEffect } from 'solid-js';

/**
 * Демо-схема для рендерера (iter 1). Голый `Renderer.View` рисует UI из JSON +
 * registry компонентов — доказывает, что движок-по-пресету смонтирован в аппе.
 * Пока хардкод; реальная витрина пресетов и приём схемы по контракту — следующие
 * итерации. Типы нод — реальные kit-пути (registry = `{ ui: Ui }`).
 */
const demoSchema = {
  components: {
    root: 'root',
    nodes: {
      root: {
        id: 'root',
        type: 'ui.Layout.Flex',
        parentId: null,
        children: ['title', 'hint'],
        props: { direction: 'col', gap: 2, p: 4 },
      },
      title: {
        id: 'title',
        type: 'ui.Typography',
        parentId: 'root',
        children: [],
        props: { children: 'Rendered from JSON ✓' },
      },
      hint: {
        id: 'hint',
        type: 'ui.Typography',
        parentId: 'root',
        children: [],
        props: { variant: 'muted', children: 'web-renderer · Renderer.View' },
      },
    },
  },
} as const;

/**
 * Display — читает контекст сверху (Controllers.Canvas) и логирует при изменении.
 * Своя кнопка ('canvas-btn') бьёт в Controllers.Canvas: standalone — меняет текст
 * локально, embedded — событие форвардится хосту (текст не меняется).
 *
 * Виджет НЕ знает, кто кормит данные — чистый потребитель контекста.
 *
 * Ниже харнеса — `<Renderer.View>`: голый рендерер по JSON-схеме (iter 1).
 */
const Display = Widget((Ui) => {
  const ctx = useCtx();

  createEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[canvas:display] text from context →', ctx.store.ctx.data?.text);
  });

  return (
    <Ui.Layout.Flex direction={'col'} gap={2} p={4}>
      <Ui.Typography>Universal Canvas — embedded ✓</Ui.Typography>
      <Ui.Button meta={{ tags: ['canvas-btn'] }}>Canvas own button</Ui.Button>
      <Ui.Typography>last: {ctx.store.ctx.data?.text ?? '—'}</Ui.Typography>

      <Renderer.View schema={demoSchema} registry={{ ui: Ui }} mode="static" />
    </Ui.Layout.Flex>
  );
});

export default Display;
