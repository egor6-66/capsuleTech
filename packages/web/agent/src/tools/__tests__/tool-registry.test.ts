import { describe, expect, it, vi } from 'vitest';
import type { IAgentTool } from '../index';
import { createToolRegistry, defineAgentTool } from '../index';

// ─── Фикстуры ────────────────────────────────────────────────────────────────

const searchTool: IAgentTool<{ q: string }, string[]> = {
  name: 'search',
  description: 'Search the web',
  parameters: {
    type: 'object',
    properties: { q: { type: 'string' } },
    required: ['q'],
  },
  execute: ({ q }) => [`result for ${q}`],
};

const insertBlockTool: IAgentTool<{ type: string }, void> = {
  name: 'insertBlock',
  description: 'Insert a UI block',
  parameters: {
    type: 'object',
    properties: { type: { type: 'string' } },
    required: ['type'],
  },
  execute: vi.fn(),
};

const deleteBlockTool: IAgentTool<{ id: string }, boolean> = {
  name: 'deleteBlock',
  description: 'Delete a UI block',
  parameters: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  execute: ({ id }) => id !== 'protected',
};

// ─── defineAgentTool ─────────────────────────────────────────────────────────

describe('defineAgentTool', () => {
  it('возвращает tool без изменений (identity)', () => {
    const tool = defineAgentTool(searchTool);
    expect(tool).toBe(searchTool);
  });

  it('сохраняет правильные типы (compile-time, проверяем runtime)', () => {
    const tool = defineAgentTool({
      name: 'typed',
      description: 'typed tool',
      parameters: {},
      execute: (args: { x: number }) => args.x * 2,
    });
    expect(tool.execute({ x: 5 })).toBe(10);
  });
});

// ─── createToolRegistry — базовые операции ───────────────────────────────────

describe('createToolRegistry', () => {
  it('создаёт реестр из переданных tool\'ов', () => {
    const reg = createToolRegistry([searchTool, insertBlockTool]);
    expect(reg.has('search')).toBe(true);
    expect(reg.has('insertBlock')).toBe(true);
  });

  it('has() возвращает false для незарегистрированного tool', () => {
    const reg = createToolRegistry([searchTool]);
    expect(reg.has('nonexistent')).toBe(false);
  });

  it('get() возвращает tool по имени', () => {
    const reg = createToolRegistry([searchTool]);
    expect(reg.get('search')).toBe(searchTool);
  });

  it('get() возвращает undefined для незарегистрированного tool', () => {
    const reg = createToolRegistry([searchTool]);
    expect(reg.get('missing')).toBeUndefined();
  });

  it('создаёт пустой реестр из пустого массива', () => {
    const reg = createToolRegistry([]);
    expect(reg.toToolDefs()).toHaveLength(0);
    expect(reg.has('anything')).toBe(false);
  });
});

// ─── toToolDefs ──────────────────────────────────────────────────────────────

describe('toToolDefs', () => {
  it('сериализует tools без поля execute', () => {
    const reg = createToolRegistry([searchTool, insertBlockTool]);
    const defs = reg.toToolDefs();

    expect(defs).toHaveLength(2);
    for (const def of defs) {
      expect(def).not.toHaveProperty('execute');
    }
  });

  it('включает name, description, parameters', () => {
    const reg = createToolRegistry([searchTool]);
    const [def] = reg.toToolDefs();

    expect(def.name).toBe('search');
    expect(def.description).toBe('Search the web');
    expect(def.parameters).toEqual(searchTool.parameters);
  });

  it('порядок defs соответствует порядку переданных tools', () => {
    const reg = createToolRegistry([searchTool, insertBlockTool, deleteBlockTool]);
    const names = reg.toToolDefs().map((d) => d.name);
    expect(names).toEqual(['search', 'insertBlock', 'deleteBlock']);
  });
});

// ─── dispatch ────────────────────────────────────────────────────────────────

describe('dispatch', () => {
  it('вызывает execute с правильными args и возвращает результат', async () => {
    const reg = createToolRegistry([searchTool]);
    const dispatchResult = await reg.dispatch({
      id: 'call-1',
      name: 'search',
      arguments: { q: 'capsule' },
    });

    expect(dispatchResult.toolCallId).toBe('call-1');
    expect(dispatchResult.name).toBe('search');
    expect(dispatchResult.result).toEqual(['result for capsule']);
  });

  it('бросает с понятным сообщением при неизвестном tool', async () => {
    const reg = createToolRegistry([searchTool]);
    await expect(
      reg.dispatch({ id: 'x', name: 'unknown', arguments: {} }),
    ).rejects.toThrow('unknown');
  });

  it('сообщение об ошибке содержит список доступных tools', async () => {
    const reg = createToolRegistry([searchTool, insertBlockTool]);
    await expect(
      reg.dispatch({ id: 'x', name: 'missing', arguments: {} }),
    ).rejects.toThrow(/search.*insertBlock|insertBlock.*search/);
  });

  it('поддерживает async execute', async () => {
    const asyncTool: IAgentTool<{ n: number }, number> = {
      name: 'double',
      description: 'doubles n',
      parameters: {},
      execute: async ({ n }) => {
        await Promise.resolve();
        return n * 2;
      },
    };
    const reg = createToolRegistry([asyncTool]);
    const { result } = await reg.dispatch({
      id: 'id1',
      name: 'double',
      arguments: { n: 7 },
    });
    expect(result).toBe(14);
  });

  it('прокидывает ошибку из execute', async () => {
    const failingTool: IAgentTool = {
      name: 'fail',
      description: 'always fails',
      parameters: {},
      execute: () => {
        throw new Error('execute error');
      },
    };
    const reg = createToolRegistry([failingTool]);
    await expect(
      reg.dispatch({ id: 'id', name: 'fail', arguments: {} }),
    ).rejects.toThrow('execute error');
  });

  it('возвращает toolCallId из переданного call.id', async () => {
    const reg = createToolRegistry([searchTool]);
    const { toolCallId } = await reg.dispatch({
      id: 'unique-42',
      name: 'search',
      arguments: { q: 'test' },
    });
    expect(toolCallId).toBe('unique-42');
  });
});

// ─── Allowlist-фильтр ────────────────────────────────────────────────────────

describe('allowlist фильтр', () => {
  it('оставляет только разрешённые tools', () => {
    const reg = createToolRegistry(
      [searchTool, insertBlockTool, deleteBlockTool],
      { allow: ['insertBlock'] },
    );

    expect(reg.has('insertBlock')).toBe(true);
    expect(reg.has('search')).toBe(false);
    expect(reg.has('deleteBlock')).toBe(false);
  });

  it('toToolDefs содержит только разрешённые', () => {
    const reg = createToolRegistry(
      [searchTool, insertBlockTool, deleteBlockTool],
      { allow: ['search', 'deleteBlock'] },
    );
    const names = reg.toToolDefs().map((d) => d.name);
    expect(names).toEqual(['search', 'deleteBlock']);
  });

  it('dispatch бросает для tool-а вне allowlist', async () => {
    const reg = createToolRegistry(
      [searchTool, insertBlockTool],
      { allow: ['insertBlock'] },
    );
    await expect(
      reg.dispatch({ id: 'x', name: 'search', arguments: { q: 'hi' } }),
    ).rejects.toThrow('search');
  });

  it('пустой allowlist [] — реестр пустой', () => {
    const reg = createToolRegistry([searchTool, insertBlockTool], { allow: [] });
    expect(reg.toToolDefs()).toHaveLength(0);
    expect(reg.has('search')).toBe(false);
  });

  it('allow: undefined — все tools регистрируются', () => {
    const reg = createToolRegistry([searchTool, insertBlockTool], { allow: undefined });
    expect(reg.has('search')).toBe(true);
    expect(reg.has('insertBlock')).toBe(true);
    expect(reg.toToolDefs()).toHaveLength(2);
  });

  it('несуществующие имена в allow игнорируются (не добавляют ghosts)', () => {
    const reg = createToolRegistry(
      [searchTool],
      { allow: ['search', 'nonexistent'] },
    );
    expect(reg.toToolDefs()).toHaveLength(1);
    expect(reg.has('nonexistent')).toBe(false);
  });
});
