/**
 * Общие типы, зеркалящие `capsule_core` (Rust).
 * Используются в /client и /tools — единственное место объявления.
 *
 * НЕ импортировать из Rust-кода; поддерживать в синхронизации вручную
 * при изменении backend/scriber/core/src/types.rs.
 */

// ─── MessageRole ─────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

// ─── Message ─────────────────────────────────────────────────────────────────

/** Одно сообщение в conversation (зеркало `capsule_core::Message`). */
export interface IMessage {
  role: MessageRole;
  content: string;
  /** base64-изображения (vision-модели). */
  images?: string[];
  /** ID tool_call (если role='tool'). */
  tool_call_id?: string;
}

// ─── ToolDef ─────────────────────────────────────────────────────────────────

/**
 * Спецификация tool'а для scriber (зеркало `capsule_core::ToolDef`).
 * Передаётся в `POST /chat/stream` → поле `tools`.
 * НЕ содержит `execute` — только описание для модели.
 */
export interface IToolDef {
  name: string;
  description: string;
  /** JSON Schema параметров. */
  parameters: Record<string, unknown>;
}

// ─── ToolCall ────────────────────────────────────────────────────────────────

/** Запрос модели на вызов tool'а (зеркало `capsule_core::ToolCall`). */
export interface IToolCall {
  /** ID вызова (для сопоставления с result). */
  id: string;
  /** Имя tool'а. */
  name: string;
  /** Аргументы как JSON-объект. */
  arguments: Record<string, unknown>;
}

// ─── ChatChunk ───────────────────────────────────────────────────────────────

/**
 * Событие SSE-стрима (зеркало `capsule_core::ChatChunk`).
 * Tagged union по полю `type`.
 */
export type ChatChunk =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; call: IToolCall }
  | { type: 'done'; content: string; tool_calls?: IToolCall[] }
  | { type: 'error'; message: string };

// ─── ChatStreamRequest ────────────────────────────────────────────────────────

/**
 * Тело `POST /chat/stream` (зеркало `ChatStreamApiRequest` в server/src/api.rs).
 *
 * ВАЖНО: поле `message` — одна строка (текущее сообщение).
 * История подтягивается сервером по `conversation_id`.
 *
 * ОГРАНИЧЕНИЕ: сервер не принимает `messages[]` (массив с ролями) напрямую —
 * см. PENDING ниже.
 */
export interface IChatStreamRequest {
  provider: string;
  model: string;
  message: string;
  images?: string[];
  conversation_id?: string;
  system?: string;
  enable_tools?: boolean;
  tools?: IToolDef[];
  temperature?: number;
}
