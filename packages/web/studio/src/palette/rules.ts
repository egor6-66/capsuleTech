/**
 * Field rules — гибкая конфигурация условной видимости/блокировки полей
 * Inspector'а в зависимости от текущих props ноды.
 *
 * Pattern: rule принимает текущие props, возвращает множества `hidden` и
 * `disabled`. Inspector фильтрует/блокирует поля соответственно.
 *
 * НЕ привязано к конкретному компоненту — registry по `manifest.type`.
 * Добавляешь новое правило — регистрируешь в `fieldRules`.
 *
 * Пример (Button + icon-size): если `size === 'icon'`, скрываем `children`,
 * потому что иконку рисует child-нода `ui.Icons.<Name>`, а текстовый
 * children лишний.
 */

export interface IFieldRuleResult {
  /** Поля скрываются из Inspector'а (визуально). */
  hidden?: readonly string[];
  /** Поля показываются, но input заблокирован. */
  disabled?: readonly string[];
}

export type FieldRule = (props: Record<string, unknown>) => IFieldRuleResult;

const buttonRule: FieldRule = (props) => {
  if (props.size === 'icon') return { hidden: ['children'] };
  return {};
};

export const fieldRules: Record<string, FieldRule> = {
  'ui.Button': buttonRule,
};

export const applyFieldRule = (type: string, props: Record<string, unknown>): IFieldRuleResult =>
  fieldRules[type]?.(props) ?? {};
