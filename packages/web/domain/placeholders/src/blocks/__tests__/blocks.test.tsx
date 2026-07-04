/**
 * Placeholders blocks — рендер + emit именованного события по клику действия.
 * `useEmitOptional` замокан по прецеденту Learn.Library.Info / Shell.Picker.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessDenied } from '../accessDenied';
import { Community } from '../community';
import { ErrorState } from '../error';
import { NotFound } from '../notFound';
import { WidgetUnavailable } from '../widgetUnavailable';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const clickAction = () => {
  const button = container.querySelector('button');
  (button as HTMLElement).click();
};

describe('Placeholders.NotFound', () => {
  it('рендерит дефолтный заголовок + eyebrow 404', () => {
    cleanup = render(() => <NotFound />, container);
    expect(container.textContent).toContain('404');
    expect(container.textContent).toContain('Страница не найдена');
  });

  it('клик по действию эмитит onHome с source', () => {
    cleanup = render(() => <NotFound />, container);
    clickAction();
    expect(emitSpy).toHaveBeenCalledWith('onHome', { source: 'Placeholders.NotFound' });
  });

  it('уважает текстовые оверрайды', () => {
    cleanup = render(() => <NotFound title="Нет такой" actionLabel="Домой" />, container);
    expect(container.textContent).toContain('Нет такой');
    expect(container.textContent).toContain('Домой');
  });
});

describe('Placeholders.Error', () => {
  it('рендерит заголовок и эмитит onRetry по клику', () => {
    cleanup = render(() => <ErrorState />, container);
    expect(container.textContent).toContain('Что-то пошло не так');
    clickAction();
    expect(emitSpy).toHaveBeenCalledWith('onRetry', { source: 'Placeholders.Error' });
  });
});

describe('Placeholders.AccessDenied', () => {
  it('рендерит заголовок и эмитит onLogin по клику', () => {
    cleanup = render(() => <AccessDenied />, container);
    expect(container.textContent).toContain('Нет доступа');
    clickAction();
    expect(emitSpy).toHaveBeenCalledWith('onLogin', { source: 'Placeholders.AccessDenied' });
  });
});

describe('Placeholders.Community', () => {
  it('рендерит заголовок и эмитит onJoin по клику', () => {
    cleanup = render(() => <Community />, container);
    expect(container.textContent).toContain('Только для сообщества');
    clickAction();
    expect(emitSpy).toHaveBeenCalledWith('onJoin', { source: 'Placeholders.Community' });
  });
});

describe('Placeholders.WidgetUnavailable', () => {
  it('рендерит компактный заголовок и эмитит onRetry по клику', () => {
    cleanup = render(() => <WidgetUnavailable />, container);
    expect(container.textContent).toContain('Виджет недоступен');
    clickAction();
    expect(emitSpy).toHaveBeenCalledWith('onRetry', {
      source: 'Placeholders.WidgetUnavailable',
    });
  });
});
