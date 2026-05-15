import { useCtx } from '../ctx';
import type { IEntityWrapper } from '../interfaces';
import { ShapeUiContext } from '../logic/shape';
import { Ui as BaseUi, UiProxy } from './ui-kit';

/**
 * `Shapes` — runtime-объект, кладётся на `globalThis` в `bootstrap.tsx`
 * (`Object.assign(globalThis, registry)`). Раньше bare-identifier через
 * AutoImport, но после публикации web-core в npm `dist/*.mjs` не
 * транспилируется AutoImport'ом, поэтому читаем через globalThis.
 */
const getShapes = (): Shapes => (globalThis as any).Shapes ?? ({} as Shapes);

export const EntityWrapper: IEntityWrapper = (Component) => {
  return function Entity(wrapperProps) {
    const ctx = useCtx();
    const Ui = ctx ? UiProxy(ctx, wrapperProps) : BaseUi;
    // ShapeUiContext.Provider даёт Shape'ам доступ к проксированному Ui —
    // это нужно для резолва `definition.as` (path-tracker) в правильный
    // wrapped-компонент с UiProxy-event-binding'ом.
    return (
      <ShapeUiContext.Provider value={Ui}>
        {Component(Ui as any, getShapes())}
      </ShapeUiContext.Provider>
    );
  };
};
