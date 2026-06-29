/**
 * WebStudio.Canvas — тонкий embed remote-канваса студии.
 *
 * Апп кладёт `<WebStudio.Canvas />` в main-слот Matrix (вместо прежнего
 * app-уровневого `Widgets.Studio.Canvas`). Логики тут нет — связка «палитра →
 * канвас» живёт в `CanvasBinding` (внутри `WebStudio.Provider`).
 *
 * `useRemote().Remote` — публичный API web-remote (тот же компонент, что и
 * глобал `Remote.View`; в пакетном коде глобалы auto-import недоступны, поэтому
 * берём его из контекста напрямую). Должен рендериться внутри `<Remote.Provider>`
 * — его монтирует `WebStudio.Provider`.
 *
 * `instanceId="main"` совпадает с `remote(canvasName, 'main')` в `CanvasBinding`
 * → IframeTransport роутит dispatch в нужный iframe.
 *
 * Регистрируется как `WebStudio.Canvas` через `../capsule` (ADR 033).
 */

import { useRemote } from '@capsuletech/web-remote';
import { Flex } from '@capsuletech/web-ui/flex';
import type { JSX } from 'solid-js';
import { useCanvasName } from '../providers/canvasContext';

const CanvasComponent = (): JSX.Element => {
  const canvasName = useCanvasName();
  const { Remote } = useRemote();

  return (
    <Flex h={'full'} w={'full'}>
      <Remote name={canvasName} instanceId="main" />
    </Flex>
  );
};

export const Canvas = CanvasComponent;

export default Canvas;
