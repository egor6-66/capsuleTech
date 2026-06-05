/**
 * @capsuletech/web-agent/client
 *
 * ОСЬ «ТРАНСПОРТ» — клиент к capsule-server (scriber) + agent-loop.
 *
 * Контракт scriber уже умеет ровно то, что нужно (см. backend/scriber/core):
 *   - per-request `provider` / `model` / `system` (маршрутизация + персона);
 *   - `enable_tools` + `tools: ToolDef[]` + стрим `ChatChunk::ToolCall`
 *     (СЕРВЕР НЕ исполняет client-side tools — релеит запрос обратно в апп);
 *   - `images: base64[]` + `Capability::Vision` (создание UI по картинке).
 *
 * Agent-loop: send → стрим токенов → на ToolCall: dispatch в реестр (../tools)
 * → append tool-result → продолжить, пока не Done.
 *
 * Headless: апп может взять только /client + /tools без UI (агент «по API»).
 *
 * TODO(owner-web-agent): реализовать createAgentClient (fetch + SSE/EventSource
 * к scriber), типобезопасный стрим, tool-call relay-цикл. Решить: сырой SSE
 * vs @capsuletech/web-query как транспорт (обсудить с главным — это deps).
 */

/** Capability модели — зеркало `capsule_core::Capability`. */
export type AgentCapability = 'completion' | 'tools' | 'vision' | 'embedding';

/** Конфиг клиента: транспорт + дефолтная маршрутизация. */
export interface IAgentClientConfig {
  /** Base URL capsule-server (scriber). Напр. '/api/agent' или абсолютный URL. */
  baseUrl: string;
  /** Provider, маршрутизируемый внутри scriber: 'ollama' | 'anthropic' | … */
  provider: string;
  /** Имя модели в формате провайдера. */
  model: string;
}

/**
 * Клиент агента (поверхность — стартовая, owner уточняет).
 * TODO(owner-web-agent): доопределить методы стрима/истории/прерывания.
 */
export interface IAgentClient {
  readonly config: IAgentClientConfig;
}

/**
 * Фабрика клиента. ЗАГЛУШКА — owner-web-agent реализует.
 */
export const createAgentClient = (_config: IAgentClientConfig): IAgentClient => {
  throw new Error(
    '[web-agent/client] createAgentClient ещё не реализован — зона owner-web-agent',
  );
};
