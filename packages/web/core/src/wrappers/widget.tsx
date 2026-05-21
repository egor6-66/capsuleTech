import { Outlet } from '@tanstack/solid-router';
import { Ui } from '../ui-kit';
import type { IWidgetWrapper } from './interfaces';
import { ShapeUiContext } from './shape';

export const WidgetWrapper: IWidgetWrapper = (Component) => {
  return function Widget(wrapperProps) {
    const baseUi = { ...(Ui as any), Outlet } as any;
    return (
      <ShapeUiContext.Provider value={baseUi}>
        {Component(baseUi, wrapperProps)}
      </ShapeUiContext.Provider>
    );
  };
};
