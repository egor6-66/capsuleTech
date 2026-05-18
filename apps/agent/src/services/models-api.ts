/**
 * Тонкий клиент к Rust-бэку capsule-server (127.0.0.1:8787) — эндпоинты моделей.
 * Сетевые вызовы отсюда разрешены только в Feature-слое.
 *
 * Имена моделей содержат `:` и ОБЯЗАТЕЛЬНО прогоняются через encodeURIComponent
 * перед подстановкой в URL-путь.
 *
 * SSE для pullModel парсится вручную (fetch + ReadableStream), так же как
 * streamChat в agent-api.ts — нативный EventSource не поддерживает POST.
 */

export const AGENT_API = 'http://127.0.0.1:8787';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface InstalledModel {
  name: string;
  size_gb: number;
  running: boolean;
}

export interface CatalogModel {
  name: string;
  description: string;
  size_gb: number;
  recommended_vram_gb: number;
  recommended_ram_gb: number;
  tags: string[];
}

export interface ModelsResponse {
  installed: Array<{ name: string; size: number; modified_at?: string }>;
  catalog: CatalogModel[];
  running: string[];
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export const fetchModels = async (): Promise<ModelsResponse> => {
  const r = await fetch(`${AGENT_API}/models`);
  if (!r.ok) throw new Error(`fetchModels: ${r.status}`);
  return r.json();
};

export const loadModel = async (name: string): Promise<void> => {
  const r = await fetch(`${AGENT_API}/models/${encodeURIComponent(name)}/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) throw new Error(`loadModel(${name}): ${r.status}`);
};

export const unloadModel = async (name: string): Promise<void> => {
  const r = await fetch(`${AGENT_API}/models/${encodeURIComponent(name)}/unload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) throw new Error(`unloadModel(${name}): ${r.status}`);
};

export const deleteModel = async (name: string): Promise<void> => {
  const r = await fetch(`${AGENT_API}/models/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error(`deleteModel(${name}): ${r.status}`);
};

/**
 * POST /models/pull → SSE stream.
 * Backend эмитит блоки `event: progress\ndata: {...}`.
 * Финальный блок: `event: done` → resolve, `event: error` → throw.
 */
export const pullModel = async (
  name: string,
  onProgress: (p: PullProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const r = await fetch(`${AGENT_API}/models/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ name }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`pullModel(${name}): ${r.status}`);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf('\n\n');
      const parsed = parsePullBlock(block);
      if (!parsed) continue;

      if (parsed.event === 'progress') {
        onProgress(parsed.data as PullProgress);
      } else if (parsed.event === 'done') {
        return;
      } else if (parsed.event === 'error') {
        const msg = (parsed.data as { message?: string }).message ?? 'pull error';
        throw new Error(`pullModel(${name}): ${msg}`);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface SseBlock {
  event: string;
  data: unknown;
}

const parsePullBlock = (block: string): SseBlock | null => {
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (!dataLines.length) return null;

  try {
    return { event: eventName, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
};
