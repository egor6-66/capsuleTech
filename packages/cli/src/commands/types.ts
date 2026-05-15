import type { CliContext, CtxType } from '../context';

export type Scope = CtxType | '*';
export type Category = 'create' | 'dev' | 'nx' | 'git' | 'workspace' | 'navigation';

export interface CommandPromptInput {
  type: 'input';
  message: string;
  placeholder?: string;
}
export interface CommandPromptSelect {
  type: 'select';
  message: string;
  options: () => Array<{ value: string; label: string; hint?: string }>;
}
export interface CommandPromptConfirm {
  type: 'confirm';
  message: string;
}
export type CommandPrompt = CommandPromptInput | CommandPromptSelect | CommandPromptConfirm;

export interface CommandParam {
  /** Имя ключа в объекте params, который придёт в action. */
  name: string;
  description: string;
  /** Обязателен (для commander). В TUI — спрашиваем через prompt. */
  required?: boolean;
  /** Прокидывается как позиционный аргумент в commander. */
  positional?: boolean;
  /** Промпт в интерактивном режиме. Если не задан — параметр считается «системным» и спрашиваться не будет. */
  prompt?: CommandPrompt;
  validate?: (v: string) => string | undefined;
  default?: unknown;
}

export type CommandAction = (
  ctx: CliContext,
  params: Record<string, unknown>,
) => Promise<unknown> | unknown;

export interface Command {
  /** Точечный путь: `create.page` → `capsule create page`. */
  id: string;
  label: string;
  icon?: string;
  description: string;
  scope: Scope[];
  category: Category;
  params?: CommandParam[];
  /** Параметры, уже зашитые в команду (одна action — несколько команд). */
  staticParams?: Record<string, unknown>;
  action: CommandAction;
}

export const matchesScope = (cmd: Command, type: CtxType): boolean =>
  cmd.scope.includes('*') || cmd.scope.includes(type);
