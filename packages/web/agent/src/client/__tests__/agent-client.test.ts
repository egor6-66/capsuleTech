import { describe, expect, it, vi } from 'vitest';
import type { ChatChunk } from '../../types';
import {
  createAgentClient,
  createMockAgentClient,
  createMockAgentClientFactory,
} from '../index';

// После рефактора транспорт делегирован в @capsuletech/web-query/stream (streamSse).
// HTTP-ошибки теперь типизированы: 404 → NotFoundError, body=null → NetworkError.

// ─── Хелпер: собрать все чанки из AsyncIterable ──────────────────────────────

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iter) {
    result.push(item);
  }
  return result;
}

// ─── createMockAgentClient ────────────────────────────────────────────────────

describe('createMockAgentClient', () => {
  const baseConfig = { baseUrl: '', provider: 'mock', model: 'test' };

  it('выдаёт все чанки из переданного массива', async () => {
    const chunks: ChatChunk[] = [
      { type: 'token', content: 'Hello' },
      { type: 'token', content: ' world' },
      { type: 'done', content: 'Hello world' },
    ];
    const client = createMockAgentClient(baseConfig, chunks);
    const result = await collect(client.chat({ message: 'hi' }));

    expect(result).toEqual(chunks);
  });

  it('выдаёт сценарий с tool_call', async () => {
    const chunks: ChatChunk[] = [
      { type: 'token', content: 'Searching...' },
      {
        type: 'tool_call',
        call: { id: 'c1', name: 'search', arguments: { q: 'hello' } },
      },
      {
        type: 'done',
        content: '',
        tool_calls: [{ id: 'c1', name: 'search', arguments: { q: 'hello' } }],
      },
    ];
    const client = createMockAgentClient(baseConfig, chunks);
    const result = await collect(client.chat({ message: 'search hello' }));

    expect(result).toHaveLength(3);
    expect(result[1].type).toBe('tool_call');
    expect(result[2].type).toBe('done');
  });

  it('выдаёт чанк error', async () => {
    const chunks: ChatChunk[] = [{ type: 'error', message: 'model overloaded' }];
    const client = createMockAgentClient(baseConfig, chunks);
    const result = await collect(client.chat({ message: 'hi' }));

    expect(result[0]).toEqual({ type: 'error', message: 'model overloaded' });
  });

  it('возвращает пустой массив при пустом наборе чанков', async () => {
    const client = createMockAgentClient(baseConfig, []);
    const result = await collect(client.chat({ message: 'hi' }));
    expect(result).toHaveLength(0);
  });

  it('config доступен через client.config', () => {
    const client = createMockAgentClient(baseConfig, []);
    expect(client.config.provider).toBe('mock');
    expect(client.config.model).toBe('test');
  });
});

// ─── createMockAgentClientFactory ────────────────────────────────────────────

describe('createMockAgentClientFactory', () => {
  const baseConfig = { baseUrl: '', provider: 'mock', model: 'test' };

  it('factory получает request с правильными полями', async () => {
    const capturedRequests: unknown[] = [];
    const client = createMockAgentClientFactory(baseConfig, (req) => {
      capturedRequests.push(req);
      return [{ type: 'done' as const, content: '' }];
    });

    await collect(
      client.chat({
        message: 'hello',
        system: 'be concise',
        enableTools: true,
      }),
    );

    expect(capturedRequests).toHaveLength(1);
    const req = capturedRequests[0] as Record<string, unknown>;
    expect(req.message).toBe('hello');
    expect(req.system).toBe('be concise');
    expect(req.enable_tools).toBe(true);
    expect(req.provider).toBe('mock');
    expect(req.model).toBe('test');
  });

  it('каждый вызов chat() получает свежий стрим', async () => {
    let callCount = 0;
    const client = createMockAgentClientFactory(baseConfig, () => {
      callCount++;
      return [{ type: 'done' as const, content: `call ${callCount}` }];
    });

    const r1 = await collect(client.chat({ message: 'first' }));
    const r2 = await collect(client.chat({ message: 'second' }));

    expect(r1[0]).toMatchObject({ content: 'call 1' });
    expect(r2[0]).toMatchObject({ content: 'call 2' });
    expect(callCount).toBe(2);
  });
});

// ─── createAgentClient — SSE через fetch ─────────────────────────────────────

describe('createAgentClient (fetch transport)', () => {
  const baseConfig = {
    baseUrl: 'http://localhost:8787',
    provider: 'ollama',
    model: 'llama3',
  };

  it('бросает при HTTP ошибке от сервера (NotFoundError от web-query)', async () => {
    // streamSse из web-query маппит HTTP 404 → NotFoundError('Not Found')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('provider not found'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = createAgentClient(baseConfig);
    await expect(collect(client.chat({ message: 'hi' }))).rejects.toThrow('Not Found');

    vi.unstubAllGlobals();
  });

  it('бросает при response.body === null (NetworkError от web-query)', async () => {
    // streamSse из web-query бросает NetworkError('Network error') при body === null
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = createAgentClient(baseConfig);
    await expect(collect(client.chat({ message: 'hi' }))).rejects.toThrow('Network error');

    vi.unstubAllGlobals();
  });

  it('парсит SSE-поток с реальными чанками через fetch-мок', async () => {
    const encoder = new TextEncoder();
    const sse = [
      'event: token\ndata: {"type":"token","content":"Hi"}\n\n',
      'event: done\ndata: {"type":"done","content":"Hi"}\n\n',
    ].join('');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: mockStream,
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = createAgentClient(baseConfig);
    const chunks = await collect(client.chat({ message: 'hello' }));

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ type: 'token', content: 'Hi' });
    expect(chunks[1]).toEqual({ type: 'done', content: 'Hi' });

    // Проверяем что fetch вызван с правильным URL и методом
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/chat/stream',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllGlobals();
  });

  it('завершается на чанке done (не читает дальше)', async () => {
    const encoder = new TextEncoder();
    // done идёт в середине — после него ничего не должно читаться
    const sse = [
      'event: done\ndata: {"type":"done","content":"end"}\n\n',
      'event: token\ndata: {"type":"token","content":"ghost"}\n\n',
    ].join('');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse));
        controller.close();
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, body: mockStream }));

    const client = createAgentClient(baseConfig);
    const chunks = await collect(client.chat({ message: 'hi' }));

    // После done стрим прерван — ghost не должен попасть
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('done');

    vi.unstubAllGlobals();
  });

  it('передаёт нужные поля в тело POST-запроса', async () => {
    const encoder = new TextEncoder();
    const sse = 'event: done\ndata: {"type":"done","content":""}\n\n';
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse));
        controller.close();
      },
    });

    let capturedBody: unknown;
    const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return Promise.resolve({ ok: true, status: 200, body: mockStream });
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = createAgentClient(baseConfig);
    await collect(
      client.chat({
        message: 'test',
        system: 'be brief',
        conversationId: 'abc-123',
        enableTools: true,
        tools: [{ name: 'fn', description: 'does stuff', parameters: {} }],
        temperature: 0.7,
      }),
    );

    expect(capturedBody).toMatchObject({
      provider: 'ollama',
      model: 'llama3',
      message: 'test',
      system: 'be brief',
      conversation_id: 'abc-123',
      enable_tools: true,
      temperature: 0.7,
    });

    vi.unstubAllGlobals();
  });
});

// ─── continueWithToolResults ──────────────────────────────────────────────────

describe('continueWithToolResults', () => {
  it('бросает с понятным PENDING-сообщением', async () => {
    const client = createMockAgentClient({ baseUrl: '', provider: 'x', model: 'y' }, []);
    await expect(
      collect(client.continueWithToolResults('conv-1', [])),
    ).rejects.toThrow('PENDING');
  });
});
