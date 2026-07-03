import type { Accessor, JSX, ValidComponent } from 'solid-js';

/**
 * Опция пикера. Shorthand-строка `'foo'` эквивалентна `{ value: 'foo' }`.
 */
export interface IPickerOption {
  value: string;
  /** Отображаемый текст. Дефолт — сам `value`. */
  label?: string;
}

/**
 * Shell.Picker — generic каркас селекта (connected-контрол, tier-2).
 *
 * Канон: шелл раздаёт каркасы селектов, апп раздаёт данные (взятые с бэка).
 * Один флоу для всех доменных выборов — темы, TTS-движки, языки. Доменность
 * приходит с данными: каркас не знает ни про темы, ни про движки.
 */
export interface IPickerProps {
  /** Опции — данные от аппа. `string` → `{ value: s }` (shorthand). */
  options: readonly (string | IPickerOption)[];
  /** Текущее значение (accessor, реактивно). Рисует галочку на совпавшей опции. */
  value?: Accessor<string | undefined>;
  /**
   * Инжект действия выбора (пара к `value` — как у ThemePicker).
   * Вызывается ДО emit'а `onPick` и до `onChange`.
   */
  onSelect?: (value: string) => void;
  /** Пост-хук — после `onSelect` и emit'а (паритет с ThemePicker.onChange). */
  onChange?: (value: string) => void;
  /** Заголовок триггера. Дефолт: текущее значение (`value()`). */
  triggerLabel?: string | JSX.Element;
  /**
   * Иконка триггера (компонент, например из `@capsuletech/web-ui/icons`).
   * Дефолт — без иконки. В `mode='sub'` уходит в leading-колонку `Dropdown.Row`.
   */
  icon?: ValidComponent;
  /** Extra-классы на триггер (standalone) / row (sub). */
  class?: string;
  /**
   * Render mode.
   *  - `'standalone'` (default) — свой `<Dropdown>` root.
   *  - `'sub'` — `<Dropdown.Sub>`, вкладывается в родительский `<Dropdown.Content>`.
   */
  mode?: 'standalone' | 'sub';
  /** Имя для named-event'а `onPick { name, value }`. Дефолт `'picker'`. */
  name?: string;
}

/**
 * Named-события пикера (ADR 032). Phantom `__events?: IPickerEvents` на
 * компоненте нужен codegen'у для `Shell.Picker.Events` (namespace-merge) —
 * host `Feature<Shell.Picker.Events>` типизирует `target.payload` в `onPick`
 * без per-handler аннотации. На runtime не используется.
 */
export interface IPickerEvents {
  onPick: { name: string; value: string };
}
