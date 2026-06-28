import { trace } from '@capsuletech/web-profiler/trace';
import { createUniqueId, onCleanup } from 'solid-js';

/**
 * Постоянная mount/dispose-инструментация UI-примитива (ADR 062).
 *
 * Зовётся первой строкой тела компонент-функции (per-instance). `id` парит
 * пару mount↔dispose, так что в дампе видно, какой узел инстанцируется дважды
 * (диагностика bug A — дубль-receive через лишний owner у `<Slot {...others}>`).
 *
 * No-op когда trace-канал off: `trace()` делает мгновенный return ДО сборки
 * события (нулевые аллокации), поэтому вызов безопасен в hot-path каждого
 * примитива. Уровень `debug`. Логику примитива хелпер не меняет.
 *
 * @param node — узел вида `web-ui.<primitive>` (kebab/lower).
 * @param data — опциональный различитель (`as`/variant/slot); `id` достаточен.
 */
export const useTrace = (node: string, data?: Record<string, unknown>): void => {
  const id = createUniqueId();
  trace(node, 'mount', { id, ...data });
  onCleanup(() => trace(node, 'dispose', { id, ...data }));
};
