/**
 * @capsuletech/web-agent/tools
 *
 * ОСЬ «ТУЛСЕТ» — реестр инструментов: ToolDef-схемы + хендлеры.
 *
 * Шов «ГДЕ исполняется tool» (закладываем явно с первого дня — здесь легко
 * наплодить escape-hatch):
 *   - client-side: editor-ops (Controllers.Editor через useEmit, ADR 032),
 *     любые мутации клиентского состояния — execute прямо в браузере;
 *   - native/server: FS, spawn-agent, MCP — execute = релей в scriber
 *     ToolProvider (capsule-native-tools / capsule-mcp).
 *
 * Свойство «агент больше ничего не умеет» = апп зарегистрировал РОВНО этот
 * набор. Нет escape-hatch — у агента физически нет других инструментов.
 *
 * TODO(owner-web-agent): createToolRegistry (имя→tool, allowlist-фильтр по
 * персоне), сериализация в ChatRequest.tools (ToolDef), маршалинг ToolCall.
 */

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
