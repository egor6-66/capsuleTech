/**
 * @capsuletech/web-agent/personas
 *
 * ОСЬ «ПЕРСОНА» — декларативные роли: system-prompt + модель + allowlist tools.
 *
 * Живёт в конфиге (внешняя настройка — цель проекта). Свойство «верстаю и
 * молчу» задаётся НЕ моделью, а узким system-prompt + ограниченным allowlist'ом.
 *
 * Примеры персон:
 *   - 'ui-builder'   — только editor-ops, «верстаю по запросу/картинке и молчу»;
 *   - 'assistant'    — разговорный, широкий/без tools;
 *   - 'full-access'  — native FS + spawn-agent (nexus, desktop).
 *
 * TODO(owner-web-agent): реестр персон + резолв allowedTools против ../tools.
 */

/** Роль агента: system-prompt + дефолт-модель + разрешённые инструменты. */
export interface IAgentPersona {
  /** Идентификатор роли: 'assistant' | 'ui-builder' | 'full-access' | … */
  id: string;
  /** System prompt (определяет поведение и границы). */
  system: string;
  /** Дефолтная модель (опц.; иначе берётся из IAgentClientConfig). */
  model?: string;
  /** Имена разрешённых tools (подмножество реестра). Пусто/undefined = без tools. */
  allowedTools?: string[];
}

/** Identity-хелпер для типизированного объявления персоны. */
export const defineAgentPersona = (persona: IAgentPersona): IAgentPersona => persona;
