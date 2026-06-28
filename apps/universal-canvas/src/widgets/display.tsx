import { createEffect } from 'solid-js';

/**
 * Display — читает контекст сверху (Controllers.Canvas) и логирует при изменении.
 * Своя кнопка ('canvas-btn') бьёт в Controllers.Canvas: standalone — меняет текст
 * локально, embedded — событие форвардится хосту (текст не меняется).
 *
 * Виджет НЕ знает, кто кормит данные — чистый потребитель контекста.
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
    </Ui.Layout.Flex>
  );
});

export default Display;
