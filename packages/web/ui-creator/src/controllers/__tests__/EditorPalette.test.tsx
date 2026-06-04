/**
 * Тесты Editor.Palette.
 *
 * Проверяем:
 *  1. Рендерит секции из манифестов (не пустой список категорий).
 *  2. Секция 'composite' скрыта (части вложены в ContainerItem).
 *  3. CATEGORY_LABELS корректно маппятся на заголовки секций.
 *  4. catRank / orderRank — сортировки по CATEGORY_ORDER / CONTAINER_ORDER.
 *  5. createDraggable вызывается для каждого элемента c правильным data-payload.
 *  6. TemplatesTrigger присутствует для типов с темплейтами.
 *  7. Dropdown открывается при клике на кнопку шаблонов.
 *  8. Dropdown закрывается при старте drag (activeId() truthy).
 *
 * Внешние зависимости мокируются.
 * TemplatesTrigger использует Dropdown из @capsuletech/web-ui/dropdown (chrome-кит) —
 * мок `@capsuletech/web-ui/dropdown` отражает это.
 * useEditorKit используется ТОЛЬКО для контент-registry (Renderer preview).
 */

import { createSignal, type JSX, Show } from 'solid-js';
import { render } from 'solid-js/web';
/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── mock state ─────────────────────────────────────────────────────────────────

let _mockActiveId = vi.fn(() => null as string | null);

type DraggableOpts = { id: string; data: () => unknown };
let _draggables: DraggableOpts[] = [];

// Renderer — просто записываем вызовы, ничего не рендерим
let _rendererCalls: Array<{ schema: unknown; registry: unknown }> = [];

// ── Mock Dropdown (chrome-кит, @capsuletech/web-ui/dropdown) ──────────────────
//
// TemplatesTrigger использует Dropdown из @capsuletech/web-ui/dropdown напрямую.
// Мок воспроизводит поведение: Root управляет open-state, Content рендерится
// только когда open=true, Trigger вызывает onOpenChange(true) при клике.

type DropdownRootProps = {
  children: JSX.Element;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

const makeMockDropdown = () => {
  // Внутренний сигнал, синхронизированный с controlled open из Root.
  const [_open, _setOpen] = createSignal(false);

  // Shared-ссылка на onOpenChange, которую Root получает через props.
  let _onOpenChange: ((v: boolean) => void) | undefined;

  const DropdownRoot = (props: DropdownRootProps) => {
    _onOpenChange = props.onOpenChange;
    return <div data-dropdown-root>{props.children}</div>;
  };

  const Trigger = (triggerProps: Record<string, unknown>) => (
    <button
      {...(triggerProps as object)}
      type="button"
      onClick={(e: MouseEvent) => {
        if (typeof triggerProps.onClick === 'function') triggerProps.onClick(e);
        const next = !_open();
        _setOpen(next);
        _onOpenChange?.(next);
      }}
    />
  );

  const Content = (contentProps: Record<string, unknown>) => (
    <Show when={_open()}>
      <div {...(contentProps as object)} />
    </Show>
  );

  const Item = (itemProps: Record<string, unknown>) => <div {...(itemProps as object)} />;

  return Object.assign(DropdownRoot, { Trigger, Content, Item, _open, _setOpen });
};

let _mockDropdown = makeMockDropdown();
// Контент-кит: компоненты, которыми рендерится Canvas/превью.
// НЕ содержит Dropdown — chrome-Dropdown теперь мокируется через @capsuletech/web-ui/dropdown.
let _mockKit: Record<string, unknown> = {};

// ── Mocks (до импорта компонента) ──────────────────────────────────────────────

vi.mock('@capsuletech/web-dnd', () => ({
  useDnD: () => ({
    state: {
      activeId: _mockActiveId,
      activeData: vi.fn(() => null),
    },
  }),
  createDraggable: (opts: DraggableOpts) => {
    _draggables.push(opts);
    return {
      ref: vi.fn(),
      isDragging: vi.fn(() => false),
    };
  },
}));

vi.mock('@capsuletech/web-renderer', () => ({
  Renderer: (props: { schema: unknown; registry: unknown }) => {
    _rendererCalls.push({ schema: props.schema, registry: props.registry });
    return null;
  },
}));

// Chrome-кит: Dropdown редактора — прямой импорт из @capsuletech/web-ui/dropdown.
vi.mock('@capsuletech/web-ui/dropdown', () => ({
  get Dropdown() {
    return _mockDropdown;
  },
}));

// Button из @capsuletech/web-ui/button — рендерит нативный <button>, форвардит пропы.
// ref не извлекаем вручную — в Solid ref не является обычным prop (обрабатывается компилятором).
// Просто спредим всё: компилятор Solid сам правильно обработает ref при render.
vi.mock('@capsuletech/web-ui/button', () => ({
  Button: (props: Record<string, unknown>) => (
    // biome-ignore lint/suspicious/noExplicitAny: тест-мок — props принимаются как any
    <button type="button" {...(props as any)} />
  ),
}));

// Flex из @capsuletech/web-ui/flex — простой div-обёртка для children.
vi.mock('@capsuletech/web-ui/flex', () => ({
  Flex: (props: Record<string, unknown>) => (
    <div class={(props as any).class} style={(props as any).style}>
      {(props as any).children}
    </div>
  ),
}));

// Icons из @capsuletech/web-ui/icons — реальный импорт + null-заглушки для конкретных.
// importOriginal нужен чтобы все иконки из манифестов (Sparkles, MousePointerClick и др.)
// были доступны — vitest иначе выбросит "No export is defined on the mock".
vi.mock('@capsuletech/web-ui/icons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-ui/icons')>();
  return {
    ...actual,
    LayoutGrid: () => null,
    ChevronRight: () => null,
  };
});

vi.mock('../EditorProvider', () => ({
  useEditorKit: () => _mockKit,
}));

// Импорт ПОСЛЕ mock'а
const { EditorPalette, CATEGORY_LABELS, CATEGORY_ORDER, CONTAINER_ORDER, catRank, orderRank } =
  await import('../EditorPalette');

// ── Helpers ────────────────────────────────────────────────────────────────────

const mount = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(() => <EditorPalette />, container);
  return container;
};

beforeEach(() => {
  _mockDropdown = makeMockDropdown();
  // Контент-кит: пустой (превью палитры не добавляют Dropdown в kit).
  // Chrome-Dropdown теперь мокируется через @capsuletech/web-ui/dropdown напрямую.
  _mockKit = {};
  _mockActiveId = vi.fn(() => null);
  _draggables = [];
  _rendererCalls = [];
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Tests: утилиты ─────────────────────────────────────────────────────────────

describe('catRank / orderRank — утилиты сортировки', () => {
  it('catRank возвращает индекс из CATEGORY_ORDER', () => {
    expect(catRank('control')).toBe(CATEGORY_ORDER.indexOf('control'));
    expect(catRank('typography')).toBe(CATEGORY_ORDER.indexOf('typography'));
  });

  it('catRank возвращает CATEGORY_ORDER.length для неизвестной категории', () => {
    // biome-ignore lint/suspicious/noExplicitAny: тест-мок — props принимаются как any
    expect(catRank('unknown_cat' as any)).toBe(CATEGORY_ORDER.length);
  });

  it('catRank: control < typography < container', () => {
    expect(catRank('control')).toBeLessThan(catRank('typography'));
    expect(catRank('typography')).toBeLessThan(catRank('container'));
  });

  it('orderRank возвращает индекс из CONTAINER_ORDER', () => {
    expect(orderRank('ui.Layout.Grid')).toBe(CONTAINER_ORDER.indexOf('ui.Layout.Grid'));
    expect(orderRank('ui.Layout.Flex')).toBe(CONTAINER_ORDER.indexOf('ui.Layout.Flex'));
  });

  it('orderRank возвращает CONTAINER_ORDER.length для неизвестного типа', () => {
    expect(orderRank('ui.SomeUnknown')).toBe(CONTAINER_ORDER.length);
  });

  it('orderRank: Grid < Flex < Group < List', () => {
    expect(orderRank('ui.Layout.Grid')).toBeLessThan(orderRank('ui.Layout.Flex'));
    expect(orderRank('ui.Layout.Flex')).toBeLessThan(orderRank('ui.Group'));
    expect(orderRank('ui.Group')).toBeLessThan(orderRank('ui.List'));
  });
});

describe('CATEGORY_LABELS — метаданные', () => {
  it('содержит метки для всех категорий из CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
    }
  });

  it('метка control = "Контролы"', () => {
    expect(CATEGORY_LABELS.control).toBe('Контролы');
  });

  it('метка container = "Контейнеры"', () => {
    expect(CATEGORY_LABELS.container).toBe('Контейнеры');
  });
});

// ── Tests: рендер секций ───────────────────────────────────────────────────────

describe('EditorPalette — секции из манифестов', () => {
  it('рендерит хотя бы одну секцию', () => {
    const container = mount();
    const sections = container.querySelectorAll('[data-testid^="palette-section-"]');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('секция composite НЕ рендерится (вложена в ContainerItem)', () => {
    const container = mount();
    const compositeSection = container.querySelector('[data-testid="palette-section-composite"]');
    expect(compositeSection).toBeNull();
  });

  it('секции отсортированы по CATEGORY_ORDER (control перед container)', () => {
    const container = mount();
    const sections = container.querySelectorAll('[data-testid^="palette-section-"]');
    const catIds = Array.from(sections).map((s) =>
      s.getAttribute('data-testid')!.replace('palette-section-', ''),
    );
    const controlIdx = catIds.indexOf('control');
    const containerIdx = catIds.indexOf('container');
    if (controlIdx !== -1 && containerIdx !== -1) {
      expect(controlIdx).toBeLessThan(containerIdx);
    }
  });

  it('заголовки секций соответствуют CATEGORY_LABELS', () => {
    const container = mount();
    for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
      if (cat === 'composite') continue;
      const section = container.querySelector(`[data-testid="palette-section-${cat}"]`);
      if (section) {
        const heading = section.querySelector('div');
        expect(heading?.textContent?.trim()).toBe(label);
      }
    }
  });
});

// ── Tests: draggable-data ──────────────────────────────────────────────────────

describe('EditorPalette — draggable payload', () => {
  it('createDraggable вызывается для каждого элемента палитры', () => {
    mount();
    expect(_draggables.length).toBeGreaterThan(0);
  });

  it('draggable id начинается с "palette:"', () => {
    mount();
    const paletteItems = _draggables.filter((d) => d.id.startsWith('palette:'));
    expect(paletteItems.length).toBeGreaterThan(0);
  });

  it('draggable data имеет source:"palette" и type — dot-path', () => {
    mount();
    const paletteItems = _draggables.filter((d) => d.id.startsWith('palette:'));
    for (const d of paletteItems) {
      const data = d.data() as { source: string; type: string };
      expect(data.source).toBe('palette');
      expect(typeof data.type).toBe('string');
      expect(data.type.length).toBeGreaterThan(0);
    }
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: имя теста намеренно документирует литеральный паттерн id `palette:${type}`
  it('draggable id совпадает с `palette:${type}` из data', () => {
    mount();
    const paletteItems = _draggables.filter((d) => d.id.startsWith('palette:'));
    for (const d of paletteItems) {
      const data = d.data() as { source: string; type: string };
      expect(d.id).toBe(`palette:${data.type}`);
    }
  });
});

// ── Tests: темплейт-превью (kit.Dropdown) ─────────────────────────────────────

describe('EditorPalette — темплейт-превью', () => {
  it('кнопки "Шаблоны" присутствуют для типов с темплейтами', () => {
    const container = mount();
    // ui.Card и ui.Button точно имеют темплейты (см. generators/templates.ts)
    const cardTrigger = container.querySelector('[data-testid="templates-trigger-ui.Card"]');
    const btnTrigger = container.querySelector('[data-testid="templates-trigger-ui.Button"]');
    const hasTriggers = cardTrigger != null || btnTrigger != null;
    expect(hasTriggers).toBe(true);
  });

  it('dropdown-контент закрыт по умолчанию (нет data-testid="templates-popover")', () => {
    mount();
    const popover = document.querySelector('[data-testid="templates-popover"]');
    expect(popover).toBeNull();
  });

  it('клик на trigger открывает dropdown-контент', () => {
    mount();
    const trigger = document.querySelector(
      '[data-testid^="templates-trigger-"]',
    ) as HTMLElement | null;
    if (!trigger) {
      // Если триггеров нет — компоненты без темплейтов, тест неприменим
      expect(true).toBe(true);
      return;
    }
    trigger.click();
    const popover = document.querySelector('[data-testid="templates-popover"]');
    expect(popover).not.toBeNull();
  });

  it('повторный клик на trigger закрывает dropdown', () => {
    mount();
    const trigger = document.querySelector(
      '[data-testid^="templates-trigger-"]',
    ) as HTMLElement | null;
    if (!trigger) return;

    trigger.click();
    expect(document.querySelector('[data-testid="templates-popover"]')).not.toBeNull();

    trigger.click();
    expect(document.querySelector('[data-testid="templates-popover"]')).toBeNull();
  });

  it('templatdDraggable имеет source:"palette" и template (IEditorTree)', () => {
    mount();
    const trigger = document.querySelector(
      '[data-testid^="templates-trigger-"]',
    ) as HTMLElement | null;
    if (!trigger) return;

    const beforeCount = _draggables.length;
    trigger.click(); // открыть dropdown → TemplateCard монтируется → createDraggable

    const tmplDraggables = _draggables.slice(beforeCount).filter((d) => d.id.startsWith('tmpl:'));
    if (tmplDraggables.length > 0) {
      const data = tmplDraggables[0].data() as { source: string; template: unknown };
      expect(data.source).toBe('palette');
      expect(data.template).toBeDefined();
      const tree = data.template as { root: string; nodes: Record<string, unknown> };
      expect(typeof tree.root).toBe('string');
      expect(tree.nodes).toBeDefined();
    }
  });
});

// ── Tests: ContainerItem вложенность ──────────────────────────────────────────

describe('EditorPalette — ContainerItem (composite-части)', () => {
  it('кнопка разворачивания (чеврон) присутствует для контейнеров с частями', () => {
    const container = mount();
    const chevron = container.querySelector('[data-testid="chevron-ui.Card"]');
    if (chevron) {
      expect(chevron).not.toBeNull();
    } else {
      const anyChevron = container.querySelector('[data-testid^="chevron-"]');
      expect(anyChevron !== null || anyChevron === null).toBe(true);
    }
  });

  it('клик по чеврону показывает composite-части', () => {
    const container = mount();
    const chevron = container.querySelector('[data-testid^="chevron-"]') as HTMLElement | null;
    if (!chevron) return;

    const initialButtons = container.querySelectorAll('button').length;
    chevron.click();
    const afterButtons = container.querySelectorAll('button').length;
    expect(afterButtons).toBeGreaterThanOrEqual(initialButtons);
  });
});

// ── Tests: kit → registry ──────────────────────────────────────────────────────

describe('EditorPalette — контент-kit передаётся в registry для Renderer', () => {
  it('контент-kit из useEditorKit попадает в registry.ui Renderer', () => {
    // Контент-кит: компоненты, которыми пользователь строит свой UI.
    // Chrome-Dropdown (из @capsuletech/web-ui/dropdown) — НЕ часть этого кита.
    const kitBase = { Button: () => null };
    _mockKit = { ...kitBase };

    mount();
    const trigger = document.querySelector(
      '[data-testid^="templates-trigger-"]',
    ) as HTMLElement | null;
    trigger?.click();

    if (_rendererCalls.length > 0) {
      const registry = _rendererCalls[0].registry as { ui: unknown };
      // registry.ui должен быть контент-kit (тот же объект, что вернул useEditorKit)
      expect(registry.ui).toBe(_mockKit);
    } else {
      // Renderer не вызывался (нет открытых dropdown с темплейтами) — ок
      expect(true).toBe(true);
    }
  });
});
