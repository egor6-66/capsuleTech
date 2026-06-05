/**
 * @capsuletech/web-agent/tools
 *
 * ОСЬ «ТУЛСЕТ» — реестр инструментов: ToolDef-схемы + хендлеры.
 *
 * Шов «ГДЕ исполняется tool» (закладываем явно с первого дня):
 *   - client-side: editor-ops (Controllers.Editor через useEmit, ADR 032),
 *     любые мутации клиентского состояния — execute прямо в браузере;
 *   - native/server: FS, spawn-agent, MCP — execute = релей в scriber
 *     ToolProvider (capsule-native-tools / capsule-mcp).
 *
 * Для /tools место исполнения определяет тот, кто tool регистрирует.
 * Внутри registry — просто диспатч через `execute(args)`.
 * Нет спец-различий — нет escape-hatch.
 *
 * Свойство «агент больше ничего не умеет» = апп зарегистрировал РОВНО этот
 * набор. Нет escape-hatch — у агента физически нет других инструментов.
 */

import type { IToolCall, IToolDef } from '../types';

export type { IToolCall, IToolDef } from '../types';

// ─── IAgentTool ───────────────────────────────────────────────────────────────

/** Спецификация инструмента — зеркало `capsule_core::ToolDef` + исполнение. */
export interface IAgentTool<Args = unknown, Result = unknown> {
  /** Уникальное имя (модель видит). */
  name: string;
  /** Человекочитаемое описание (модель видит). */
  description: string;
  /** JSON Schema параметров. */
  parameters: Record<string, unknown>;
  /** Исполнение tool-call: client-side мутация ИЛИ релей в native/server. */
  execute: (args: Args) => Result | Promise<Result>;
}

/** Identity-хелпер для типизированного объявления инструмента. */
export const defineAgentTool = <Args, Result>(
  tool: IAgentTool<Args, Result>,
): IAgentTool<Args, Result> => tool;

// ─── ToolRegistry ────────────────────────────────────────────────────────────

/** Опции реестра. */
export interface IToolRegistryOptions {
  /**
   * Allowlist имён: только эти tool'ы будут зарегистрированы.
   * Используется персонами — «агент умеет ровно это».
   * undefined = все переданные tools.
   */
  allow?: string[];
}

/** Результат диспатча одного ToolCall. */
export interface IToolDispatchResult {
  /** ID вызова из `IToolCall.id`. */
  toolCallId: string;
  /** Имя tool'а. */
  name: string;
  /** Результат `execute(args)`. */
  result: unknown;
}

/** Реестр инструментов. */
export interface IToolRegistry {
  /**
   * Сериализация в массив ToolDef для `POST /chat/stream`.
   * НЕ содержит `execute` — только описание для модели.
   */
  toToolDefs(): IToolDef[];

  /** Получить tool по имени. `undefined` если не найден. */
  get(name: string): IAgentTool | undefined;

  /** Проверить наличие tool'а по имени. */
  has(name: string): boolean;

  /**
   * Диспатч ToolCall: найти tool → `execute(arguments)` → вернуть результат.
   * @throws {Error} если tool с данным именем не найден в реестре.
   */
  dispatch(call: IToolCall): Promise<IToolDispatchResult>;
}

// ─── Реализация ──────────────────────────────────────────────────────────────

class ToolRegistry implements IToolRegistry {
  private readonly tools: Map<string, IAgentTool>;

  constructor(tools: IAgentTool[], options?: IToolRegistryOptions) {
    this.tools = new Map();

    for (const tool of tools) {
      // Allowlist-фильтр: если allow задан — пропускаем tool'ы вне списка
      if (options?.allow !== undefined && !options.allow.includes(tool.name)) {
        continue;
      }
      this.tools.set(tool.name, tool);
    }
  }

  toToolDefs(): IToolDef[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  get(name: string): IAgentTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async dispatch(call: IToolCall): Promise<IToolDispatchResult> {
    const tool = this.tools.get(call.name);
    if (tool === undefined) {
      throw new Error(
        `[web-agent/tools] Tool "${call.name}" не найден в реестре. ` +
          `Доступные: [${Array.from(this.tools.keys()).join(', ')}]`,
      );
    }

    const result = await tool.execute(call.arguments);
    return {
      toolCallId: call.id,
      name: call.name,
      result,
    };
  }
}

// ─── Фабрика ─────────────────────────────────────────────────────────────────

/**
 * Создаёт реестр инструментов.
 *
 * @param tools — список инструментов
 * @param options.allow — allowlist имён (персона ограничивает набор)
 *
 * @example
 * ```ts
 * const registry = createToolRegistry(
 *   [searchTool, insertBlockTool],
 *   { allow: ['insertBlock'] }  // только editor-ops для ui-builder персоны
 * );
 *
 * // Сериализация для запроса в scriber
 * const toolDefs = registry.toToolDefs();
 *
 * // Диспатч tool-call из модели
 * const result = await registry.dispatch(toolCallFromStream);
 * ```
 */
export const createToolRegistry = (
  tools: IAgentTool[],
  options?: IToolRegistryOptions,
): IToolRegistry => new ToolRegistry(tools, options);
