/**
 * @capsuletech/web-agent/client
 *
 * ОСЬ «ТРАНСПОРТ» — клиент к capsule-server (scriber) + agent-loop.
 *
 * Контракт scriber (backend/scriber/core/src/types.rs):
 *   - POST /chat/stream → SSE (event: token|tool_call|done|error)
 *   - Тело: { provider, model, message, images?, conversation_id?,
 *             system?, enable_tools?, tools?, temperature? }
 *   - ChatChunk tagged union: Token/ToolCall/Done/Error
 *
 * Транспорт: @capsuletech/web-query/stream (streamSse).
 * Только consumer — SSE-парсер живёт в web-query.
 */

import { streamSse } from '@capsuletech/web-query/stream';
import type { ChatChunk, IChatStreamRequest, IToolDef } from '../types';

export type { ChatChunk } from '../types';

// ─── Конфиг ──────────────────────────────────────────────────────────────────

/** Конфиг клиента: транспорт + дефолтная маршрутизация. */
export interface IAgentClientConfig {
  /**
   * Base URL capsule-server (scriber).
   * Напр. 'http://127.0.0.1:8787' или '/api/agent' (прокси).
   * Без trailing slash.
   */
  baseUrl: string;
  /** Provider, маршрутизируемый внутри scriber: 'ollama' | 'anthropic' | … */
  provider: string;
  /** Имя модели в формате провайдера. */
  model: string;
  /**
   * Mock-транспорт для тестов и dev без живого scriber.
   * Если передан — fetch не вызывается.
   */
  transport?: IAgentTransport;
}

// ─── Входные данные чата ─────────────────────────────────────────────────────

/** Входные данные одного chat-вызова. */
export interface IChatInput {
  /** Текст пользовательского сообщения. */
  message: string;
  /** base64-изображения (vision-модели). */
  images?: string[];
  /** ID существующей conversation для сохранения истории. */
  conversationId?: string;
  /** System prompt (перекрывает дефолт из конфига). */
  system?: string;
  /** Список tool-дескрипторов (без execute). */
  tools?: IToolDef[];
  /** Включить tools (default false). */
  enableTools?: boolean;
  /** Температура sampling'а. */
  temperature?: number;
}

// ─── Transport seam ───────────────────────────────────────────────────────────

/**
 * Абстракция транспорта — позволяет подменить fetch+SSE в тестах.
 * Реализация по умолчанию (fetchTransport) ходит в scriber.
 * createMockAgentClient подаёт заранее заготовленный стрим.
 */
export interface IAgentTransport {
  stream(request: IChatStreamRequest): AsyncIterable<ChatChunk>;
}

// ─── Публичный интерфейс клиента ──────────────────────────────────────────────

export interface IAgentClient {
  readonly config: IAgentClientConfig;

  /**
   * Один turn: отправить сообщение → стримить ChatChunk.
   * AsyncIterable: потребитель итерирует `for await (const chunk of client.chat(input))`.
   *
   * Завершается когда пришёл чанк `done` или `error`.
   * Tool-вызовы (`tool_call`) включаются в стрим — потребитель (controller)
   * сам решает, диспатчить ли их в ToolRegistry.
   */
  chat(input: IChatInput): AsyncIterable<ChatChunk>;

  /**
   * PENDING(scriber): multi-turn feedback после tool-результатов.
   *
   * Текущее ограничение: POST /chat/stream принимает одну строку `message` +
   * `conversation_id` (история на сервере). Нет возможности передать
   * messages[] с tool-role сообщениями — т.е. клиент не может сказать модели
   * «вот результат tool-call, продолжай».
   *
   * Что требуется от scriber (escalate через главного к owner-scriber):
   *   Добавить в ChatStreamApiRequest поле `messages?: Message[]` —
   *   полный массив с ролями (user/assistant/tool), чтобы клиент управлял
   *   историей включая tool-role ответы. При наличии `messages[]` поле
   *   `message` (строка) игнорируется или становится опциональным.
   *   Это разблокирует полный multi-turn agent-loop (tool → result → continue).
   *
   * @throws {Error} — intentional, пока контракт не расширен
   */
  continueWithToolResults(
    conversationId: string,
    toolResults: Array<{ toolCallId: string; result: unknown }>,
  ): AsyncIterable<ChatChunk>;
}

// ─── Дефолтный транспорт (web-query/stream) ──────────────────────────────────

/**
 * Реальный транспорт: делегирует в `@capsuletech/web-query/stream`.
 * Получает иерархию ошибок web-query (HttpError → Unauthorized/Server/…),
 * AbortSignal, bases-резолв и defaultHeaders — ничего из этого не дублируем.
 *
 * JSON-парсинг делаем вручную (не streamSseJson), чтобы пропускать keep-alive
 * кадры от scriber без данных (frame.data может быть пустым).
 */
function createFetchTransport(baseUrl: string): IAgentTransport {
  return {
    async *stream(request: IChatStreamRequest): AsyncIterable<ChatChunk> {
      for await (const frame of streamSse({ baseUrl, path: '/chat/stream', body: request })) {
        if (!frame.data) {
          // keep-alive или пустой кадр — пропускаем
          continue;
        }
        let chunk: ChatChunk;
        try {
          chunk = JSON.parse(frame.data) as ChatChunk;
        } catch {
          // Не валидный JSON — пропускаем кадр
          continue;
        }
        yield chunk;
        if (chunk.type === 'done' || chunk.type === 'error') {
          return;
        }
      }
    },
  };
}

// ─── Реализация клиента ───────────────────────────────────────────────────────

class AgentClient implements IAgentClient {
  readonly config: IAgentClientConfig;
  private readonly transport: IAgentTransport;

  constructor(config: IAgentClientConfig) {
    this.config = config;
    this.transport = config.transport ?? createFetchTransport(config.baseUrl);
  }

  async *chat(input: IChatInput): AsyncIterable<ChatChunk> {
    const request: IChatStreamRequest = {
      provider: this.config.provider,
      model: this.config.model,
      message: input.message,
      ...(input.images !== undefined && { images: input.images }),
      ...(input.conversationId !== undefined && {
        conversation_id: input.conversationId,
      }),
      ...(input.system !== undefined && { system: input.system }),
      ...(input.enableTools !== undefined && { enable_tools: input.enableTools }),
      ...(input.tools !== undefined && { tools: input.tools }),
      ...(input.temperature !== undefined && { temperature: input.temperature }),
    };

    yield* this.transport.stream(request);
  }

  // eslint-disable-next-line require-yield
  async *continueWithToolResults(
    _conversationId: string,
    _toolResults: Array<{ toolCallId: string; result: unknown }>,
  ): AsyncIterable<ChatChunk> {
    // PENDING(scriber): требует messages[] в POST /chat/stream — координирует
    // главный с owner-scriber. Добавить в ChatStreamApiRequest поле
    // `messages?: Message[]` с поддержкой role='tool' и tool_call_id, чтобы
    // клиент мог управлять историей включая tool-role ответы.
    throw new Error(
      '[web-agent/client] PENDING: continueWithToolResults не реализован — ' +
        'ждём расширения POST /chat/stream (messages[] + tool-role) от owner-scriber.',
    );
  }
}

// ─── Фабрики ─────────────────────────────────────────────────────────────────

/** Создаёт клиент, говорящий с живым scriber через fetch + SSE. */
export const createAgentClient = (config: IAgentClientConfig): IAgentClient =>
  new AgentClient(config);

/**
 * Создаёт клиент с mock-транспортом для тестов / dev без живого scriber.
 *
 * @param config — конфиг (baseUrl может быть любым, fetch не вызывается)
 * @param chunks — список чанков, которые будут выданы последовательно
 *
 * @example
 * ```ts
 * const client = createMockAgentClient(
 *   { baseUrl: '', provider: 'mock', model: 'test' },
 *   [
 *     { type: 'token', content: 'Hello' },
 *     { type: 'done', content: 'Hello' },
 *   ]
 * );
 * for await (const chunk of client.chat({ message: 'hi' })) { ... }
 * ```
 */
export const createMockAgentClient = (
  config: Omit<IAgentClientConfig, 'transport'>,
  chunks: ChatChunk[],
): IAgentClient => {
  const mockTransport: IAgentTransport = {
    async *stream(): AsyncIterable<ChatChunk> {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
  return new AgentClient({ ...config, transport: mockTransport });
};

/**
 * Создаёт клиент с фабричным mock-транспортом.
 * Каждый вызов `chat()` получает свежий стрим из `factory`.
 *
 * @example
 * ```ts
 * const client = createMockAgentClientFactory(cfg, () => [
 *   { type: 'token', content: 'Hi' },
 *   { type: 'tool_call', call: { id: '1', name: 'search', arguments: {} } },
 *   { type: 'done', content: 'Hi', tool_calls: [...] },
 * ]);
 * ```
 */
export const createMockAgentClientFactory = (
  config: Omit<IAgentClientConfig, 'transport'>,
  factory: (request: IChatStreamRequest) => ChatChunk[],
): IAgentClient => {
  const mockTransport: IAgentTransport = {
    async *stream(request: IChatStreamRequest): AsyncIterable<ChatChunk> {
      for (const chunk of factory(request)) {
        yield chunk;
      }
    },
  };
  return new AgentClient({ ...config, transport: mockTransport });
};
