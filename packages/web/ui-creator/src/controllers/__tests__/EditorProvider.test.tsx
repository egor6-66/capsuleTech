/**
 * Тесты EditorProvider.
 *
 * Проверяем:
 *  1. DnDProvider присутствует в дереве (useDnD() не бросает)
 *  2. useEditorKit() возвращает переданный kit
 *  3. children рендерятся
 *  4. showDefaultOverlay = true по умолчанию (передаётся в DnDProvider)
 *  5. showDefaultOverlay = false через проп
 */

import { render } from 'solid-js/web';
/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditorKit } from '../EditorProvider';

// ── Трекинг вызовов DnDProvider ───────────────────────────────────────────

const _dndProviderCalls: Array<{ showDefaultOverlay: unknown }> = [];

vi.mock('@capsuletech/web-dnd', () => ({
  DnDProvider: (props: { children: unknown; showDefaultOverlay?: boolean }) => {
    _dndProviderCalls.push({ showDefaultOverlay: props.showDefaultOverlay });
    // Рендерим children напрямую — нам важна структура, не DnD-функциональность
    return props.children as any;
  },
}));

// Импорт ПОСЛЕ mock'а
const { EditorProvider } = await import('../EditorProvider');

// ── helpers ───────────────────────────────────────────────────────────────

const mount = (props: { kit?: object; showDefaultOverlay?: boolean } = {}) => {
  const kit = props.kit ?? { Button: () => null };
  let capturedKit: unknown;

  const container = document.createElement('div');
  document.body.appendChild(container);

  render(
    () => (
      <EditorProvider kit={kit as any} showDefaultOverlay={props.showDefaultOverlay}>
        <KitReader
          onKit={(k) => {
            capturedKit = k;
          }}
        />
      </EditorProvider>
    ),
    container,
  );

  return { container, capturedKit, kit };
};

/** Вспомогательный компонент: читает kit через useEditorKit и передаёт колбеку. */
const KitReader = (p: { onKit: (k: unknown) => void }) => {
  const k = useEditorKit();
  p.onKit(k);
  return <span data-testid="kit-reader" />;
};

afterEach(() => {
  document.body.innerHTML = '';
  _dndProviderCalls.length = 0;
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('EditorProvider — DnDProvider mounting', () => {
  it('монтирует DnDProvider (вызов перехвачен моком)', () => {
    mount();
    expect(_dndProviderCalls).toHaveLength(1);
  });

  it('showDefaultOverlay = true по умолчанию', () => {
    mount();
    expect(_dndProviderCalls[0].showDefaultOverlay).toBe(true);
  });

  it('showDefaultOverlay = false если передан явно', () => {
    mount({ showDefaultOverlay: false });
    expect(_dndProviderCalls[0].showDefaultOverlay).toBe(false);
  });
});

describe('EditorProvider — kit context', () => {
  it('useEditorKit() возвращает переданный kit', () => {
    const kit = { Button: () => null, Input: () => null };
    const { capturedKit } = mount({ kit });
    expect(capturedKit).toBe(kit);
  });

  it('children рендерятся внутри провайдера', () => {
    const { container } = mount();
    expect(container.querySelector('[data-testid="kit-reader"]')).not.toBeNull();
  });
});

describe('EditorProvider — useEditorKit вне провайдера бросает', () => {
  it('бросает Error вне <EditorProvider>', () => {
    expect(() => {
      let err: unknown;
      render(() => {
        try {
          useEditorKit();
        } catch (e) {
          err = e;
        }
        return <span />;
      }, document.createElement('div'));
      if (err) throw err;
    }).toThrow('[web-ui-creator] useEditorKit()');
  });
});
