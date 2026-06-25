/**
 * Tests for ContractArtifactPlugin (ADR 060 Phase 1, builders 2-of-2).
 *
 * Покрывает:
 *  - чистые генераторы (manifest / schema / d.ts / json-schema → TS);
 *  - POC-нюанс: schema.json имеет top-level `properties`, НЕ `$ref`;
 *  - инжект import'а defineContract (идемпотентный);
 *  - matchContractRequest (URL → имя файла, с base-префиксом / query);
 *  - produceArtifacts: contract.ts отсутствует → null (no-op);
 *  - produceArtifacts: contract.ts есть → 4 файла (esbuild bundle + eval, end-to-end).
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildContractDts,
  buildManifestJson,
  buildSchemaJson,
  DEFINE_CONTRACT_IMPORT,
  ensureDefineContractImport,
  type IContractLike,
  jsonSchemaToTs,
  matchContractRequest,
  produceArtifacts,
} from '../contractArtifact';

const makeContract = (): IContractLike => ({
  in: {
    setTheme: z.object({ theme: z.string() }),
  },
  out: {
    onLogin: z.object({ token: z.string(), expiresAt: z.number().optional() }),
  },
});

// ---------------------------------------------------------------------------
// manifest.json
// ---------------------------------------------------------------------------

describe('buildManifestJson', () => {
  it('содержит name/version и имена in/out событий', () => {
    const out = JSON.parse(buildManifestJson('my-app', '1.2.3', makeContract()));
    expect(out).toEqual({
      name: 'my-app',
      version: '1.2.3',
      in: ['setTheme'],
      out: ['onLogin'],
    });
  });
});

// ---------------------------------------------------------------------------
// schema.json — POC-нюанс
// ---------------------------------------------------------------------------

describe('buildSchemaJson', () => {
  it('эмитит инлайн-схему с top-level `properties` (НЕ $ref/definitions)', () => {
    const out = JSON.parse(buildSchemaJson(makeContract()));
    const setTheme = out.in.setTheme;
    // POC-нюанс: без опции `name` — top-level properties доступны для walk-рендера.
    expect(setTheme.type).toBe('object');
    expect(setTheme.properties).toBeDefined();
    expect(setTheme.properties.theme).toEqual({ type: 'string' });
    // НЕ обёрнуто в $ref + definitions.
    expect(setTheme.$ref).toBeUndefined();
    expect(out.$defs).toBeUndefined();
    expect(out.definitions).toBeUndefined();
  });

  it('сохраняет обе оси с их событиями', () => {
    const out = JSON.parse(buildSchemaJson(makeContract()));
    expect(Object.keys(out.in)).toEqual(['setTheme']);
    expect(Object.keys(out.out)).toEqual(['onLogin']);
    expect(out.out.onLogin.properties.token).toEqual({ type: 'string' });
  });
});

// ---------------------------------------------------------------------------
// jsonSchemaToTs
// ---------------------------------------------------------------------------

describe('jsonSchemaToTs', () => {
  it('примитивы', () => {
    expect(jsonSchemaToTs({ type: 'string' })).toBe('string');
    expect(jsonSchemaToTs({ type: 'number' })).toBe('number');
    expect(jsonSchemaToTs({ type: 'integer' })).toBe('number');
    expect(jsonSchemaToTs({ type: 'boolean' })).toBe('boolean');
    expect(jsonSchemaToTs({ type: 'null' })).toBe('null');
  });

  it('object с required/optional', () => {
    const ts = jsonSchemaToTs({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a'],
    });
    expect(ts).toContain('"a": string;');
    expect(ts).toContain('"b"?: number;');
  });

  it('массивы и enum', () => {
    expect(jsonSchemaToTs({ type: 'array', items: { type: 'string' } })).toBe('string[]');
    expect(jsonSchemaToTs({ enum: ['a', 'b'] })).toBe('"a" | "b"');
  });

  it('неизвестное → unknown', () => {
    expect(jsonSchemaToTs({})).toBe('unknown');
    expect(jsonSchemaToTs(null)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// contract.d.ts
// ---------------------------------------------------------------------------

describe('buildContractDts', () => {
  it('эмитит InEvents / OutEvents интерфейсы из схем', () => {
    const dts = buildContractDts(makeContract());
    expect(dts).toContain('export interface InEvents {');
    expect(dts).toContain('export interface OutEvents {');
    expect(dts).toContain('"setTheme":');
    expect(dts).toContain('"onLogin":');
    expect(dts).toContain('"theme": string;');
    expect(dts).toContain('"token": string;');
    // self-contained — без импортов.
    expect(dts).not.toContain('import');
  });

  it('пустые оси → пустые интерфейсы', () => {
    const dts = buildContractDts({ in: {}, out: {} });
    expect(dts).toContain('export interface InEvents {}');
    expect(dts).toContain('export interface OutEvents {}');
  });
});

// ---------------------------------------------------------------------------
// ensureDefineContractImport
// ---------------------------------------------------------------------------

describe('ensureDefineContractImport', () => {
  it('инжектит import, когда defineContract — bare-глобал', () => {
    const out = ensureDefineContractImport(
      'export default defineContract((z) => ({ in: {}, out: {} }));',
    );
    expect(out.startsWith("import { defineContract } from '@capsuletech/web-core/contract';")).toBe(
      true,
    );
  });

  it('идемпотентно, когда import уже есть', () => {
    const src =
      "import { defineContract } from '@capsuletech/web-core/contract';\nexport default defineContract((z) => ({ in: {}, out: {} }));";
    expect(ensureDefineContractImport(src)).toBe(src);
  });

  it('не дублирует, если defineContract реально импортирован (любой источник)', () => {
    const src =
      "import { defineContract } from './local';\nexport default defineContract((z) => x);";
    expect(ensureDefineContractImport(src)).toBe(src);
  });

  it('инжектит при ДРУГОМ импорте + bare defineContract (регекс не ложно-срабатывает)', () => {
    const src = "import { Marker } from './entities';\nexport default defineContract((z) => x);";
    const out = ensureDefineContractImport(src);
    expect(out.startsWith(DEFINE_CONTRACT_IMPORT)).toBe(true);
    // исходный другой импорт сохранён
    expect(out).toContain("import { Marker } from './entities';");
  });

  it('инжектит, если слово "import" встречается лишь в комментарии перед bare defineContract', () => {
    const src = '// defineContract авто-import\nexport default defineContract((z) => x);';
    expect(ensureDefineContractImport(src).startsWith(DEFINE_CONTRACT_IMPORT)).toBe(true);
  });

  it('инжектит при многострочном named-import другого символа', () => {
    const src =
      "import {\n  Marker,\n  Other,\n} from './e';\nexport default defineContract((z) => x);";
    expect(ensureDefineContractImport(src).startsWith(DEFINE_CONTRACT_IMPORT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchContractRequest
// ---------------------------------------------------------------------------

describe('matchContractRequest', () => {
  it('извлекает имя файла из URL', () => {
    expect(matchContractRequest('/.capsule/contract/manifest.json')).toBe('manifest.json');
    expect(matchContractRequest('/.capsule/contract/schema.json')).toBe('schema.json');
    expect(matchContractRequest('/.capsule/contract/contract.mjs')).toBe('contract.mjs');
  });

  it('работает с base-префиксом и query', () => {
    expect(matchContractRequest('/ewc/.capsule/contract/manifest.json')).toBe('manifest.json');
    expect(matchContractRequest('/.capsule/contract/manifest.json?t=1')).toBe('manifest.json');
  });

  it('возвращает null для не-контрактных URL', () => {
    expect(matchContractRequest('/src/main.tsx')).toBeNull();
    expect(matchContractRequest(undefined)).toBeNull();
    expect(matchContractRequest('/.capsule/contract/')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// produceArtifacts — end-to-end (esbuild bundle + eval)
// ---------------------------------------------------------------------------

describe('produceArtifacts', () => {
  // Фикстуры создаём ВНУТРИ пакета (process.cwd() = корень vite-builder), чтобы
  // node-резолвинг esbuild'а нашёл `zod` через node_modules пакета (как у реального
  // app'а, где zod — его dependency). os.tmpdir() вне монорепо → "Could not resolve zod".
  const tmpDirs: string[] = [];
  const makeTmp = () => {
    const dir = mkdtempSync(join(process.cwd(), '.tmp-contract-'));
    tmpDirs.push(dir);
    return dir;
  };

  afterAll(() => {
    for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('no-op (null), если contract.ts отсутствует', async () => {
    const dir = makeTmp();
    expect(await produceArtifacts(dir)).toBeNull();
  });

  it('эмитит 4 файла, когда contract.ts есть', async () => {
    const dir = makeTmp();
    // Локальный defineContract-стаб (через zod), чтобы тест не зависел от dist
    // workspace-пакетов. Импорт из не-web-core источника → инжектор не трогает.
    writeFileSync(
      join(dir, '_dc.ts'),
      "import { z } from 'zod';\nexport const defineContract = (b) => b(z);\n",
    );
    writeFileSync(
      join(dir, 'contract.ts'),
      [
        "import { defineContract } from './_dc';",
        'export default defineContract((z) => ({',
        '  in: { setTheme: z.object({ theme: z.string() }) },',
        '  out: { onLogin: z.object({ token: z.string() }) },',
        '}));',
        '',
      ].join('\n'),
    );
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'fixture-remote', version: '9.9.9' }),
    );

    const files = await produceArtifacts(dir);
    expect(files).not.toBeNull();
    const f = files!;
    expect([...f.keys()].sort()).toEqual([
      'contract.d.ts',
      'contract.mjs',
      'manifest.json',
      'schema.json',
    ]);

    // manifest — name/version из package.json + имена событий.
    const manifest = JSON.parse(f.get('manifest.json')!);
    expect(manifest).toEqual({
      name: 'fixture-remote',
      version: '9.9.9',
      in: ['setTheme'],
      out: ['onLogin'],
    });

    // schema — инлайн properties.
    const schema = JSON.parse(f.get('schema.json')!);
    expect(schema.in.setTheme.properties.theme).toEqual({ type: 'string' });

    // contract.mjs — self-contained ESM с дефолт-экспортом.
    expect(f.get('contract.mjs')).toContain('export');
    expect(f.get('contract.mjs')!.length).toBeGreaterThan(0);
  }, 30_000);
});
