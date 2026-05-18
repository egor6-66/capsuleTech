/**
 * Тонкий клиент к Rust-бэку capsule-server (127.0.0.1:8787).
 * Эндпоинты задокументированы в memory/project_backend_ollama_roadmap.md.
 *
 * SSE-стрим парсится руками (fetch + ReadableStream), а не через EventSource,
 * потому что нативный EventSource умеет только GET, а у нас POST.
 */

export const AGENT_API = 'http://127.0.0.1:8787';

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export const listModels = async (): Promise<OllamaModel[]> => {
  const r = await fetch(`${AGENT_API}/models`);
  if (!r.ok) throw new Error(`models: ${r.status}`);
  const data = await r.json();
  return data.models ?? data ?? [];
};

export interface CreatedConversation {
  id: string;
  messages: unknown[];
}

export const createConversation = async (): Promise<CreatedConversation> => {
  const r = await fetch(`${AGENT_API}/conversations`, { method: 'POST' });
  if (!r.ok) throw new Error(`createConversation: ${r.status}`);
  return r.json();
};

export type StreamEvent =
  | { type: 'token'; iteration: number; content: string }
  | { type: 'tool_call'; iteration: number; name: string; arguments: unknown }
  | { type: 'tool_result'; iteration: number; name: string; result: string }
  | { type: 'done'; iterations: number; final: string; conversation_id?: string | null }
  | { type: 'error'; message: string };

export interface StreamChatArgs {
  model: string;
  prompt: string;
  conversationId?: string;
  rawTools?: boolean;
  signal?: AbortSignal;
  onEvent: (e: StreamEvent) => void;
}

/**
 * POST /chat/stream → SSE. Парсим вручную: split по `\n\n` → блоки
 * `event: <name>\ndata: <json>`. Backend гарантирует строки этого формата.
 */
export const streamChat = async ({
  model,
  prompt,
  conversationId,
  rawTools,
  signal,
  onEvent,
}: StreamChatArgs): Promise<void> => {
  const r = await fetch(`${AGENT_API}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      model,
      prompt,
      conversation_id: conversationId,
      raw_tools: rawTools ?? false,
    }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`chat/stream: ${r.status}`);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Разбор по разделителю SSE-блоков.
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = parseSseBlock(block);
      if (event) onEvent(event);
      idx = buffer.indexOf('\n\n');
    }
  }
};

const parseSseBlock = (block: string): StreamEvent | null => {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  const raw = dataLines.join('\n');
  try {
    const parsed = JSON.parse(raw);
    return { type: eventName as StreamEvent['type'], ...parsed };
  } catch {
    return null;
  }
};
