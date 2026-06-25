/**
 * ContractArtifactPlugin — эмиттер контракт-артефакта ремоут-аппа (ADR 060 Phase 1, builders 2-of-2).
 *
 * ## Зачем
 *
 * ADR 060 D3: сборка встраиваемого приложения эмитит **публичный контракт** из
 * `apps/<app>/contract.ts` (одна Zod-схема `defineContract((z) => ({ in, out }))`)
 * в виде четырёх производных артефактов, хостящихся рядом с аппом под
 * `${url}/.capsule/contract/...`:
 *
 *   | Файл           | Из чего                                                          |
 *   |----------------|------------------------------------------------------------------|
 *   | `manifest.json`| `{ name, version }` (package.json аппа) + имена in/out событий    |
 *   | `schema.json`  | каждое in/out событие → `zodToJsonSchema(schema)` (инлайн)        |
 *   | `contract.d.ts`| `InEvents` / `OutEvents` интерфейсы (self-contained, для host'а)  |
 *   | `contract.mjs` | self-contained ESM с дефолт-экспортом контракта (runtime-валидация хостом) |
 *
 * Хост вендорит артефакт (Phase 2), студия фетчит (Phase 4).
 *
 * ## Как
 *
 * Один конвейер `produceArtifacts`:
 *   1. esbuild bundle `contract.ts` (через stdin с инжектом import'а defineContract,
 *      если автор не написал его руками — как defineEndpoint-инжект) → self-contained
 *      ESM (zod инлайнится). Это и есть `contract.mjs`.
 *   2. eval бандла через data:-URL dynamic import → живой объект контракта (zod-схемы).
 *   3. Из объекта: manifest.json / schema.json / contract.d.ts.
 *
 * Раздача:
 *   - **build**: `this.emitFile({ type: 'asset', fileName: '.capsule/contract/<name>' })`
 *     → попадает в `dist/.capsule/contract/*`, хостится статикой под base.
 *   - **dev**: middleware отдаёт `/.capsule/contract/*` из памяти; rebuild на изменение
 *     `contract.ts`.
 *
 * Если `apps/<app>/contract.ts` нет — плагин полный no-op (не все аппы — ремоуты).
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { build as esbuild } from 'esbuild';
import type { Plugin, ViteDevServer } from 'vite';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Минимальная структурная форма контракта (см. `IContract` в web-core/contract).
 * Намеренно НЕ импортируем zod / web-core — плагин знает только форму `{ in, out }`,
 * схемы трактует как непрозрачные значения и передаёт в `zodToJsonSchema`.
 */
export interface IContractLike {
  in: Record<string, unknown>;
  out: Record<string, unknown>;
}

/** Карта `имя файла артефакта → содержимое`. */
export type ContractArtifactFiles = Map<string, string>;

/** Имена эмитируемых файлов — единая точка правды (порядок детерминирован). */
export const CONTRACT_ARTIFACT_NAMES = [
  'manifest.json',
  'schema.json',
  'contract.d.ts',
  'contract.mjs',
] as const;

/** URL-путь, под которым хостится артефакт (относительно base). */
export const CONTRACT_URL_PREFIX = '/.capsule/contract/';

// ---------------------------------------------------------------------------
// Pure generators (тестируемые — принимают готовый объект контракта)
// ---------------------------------------------------------------------------

/**
 * ⚠️ POC-нюанс (ADR 060 Phase 0): `zodToJsonSchema` вызывается БЕЗ опции `name` и
 * с `$refStrategy: 'none'` — иначе схема оборачивается в `$ref` + `definitions`,
 * а top-level `properties` прячутся (ломает walk-рендер в студии). Без `name` —
 * инлайн-схема с top-level `properties`.
 */
const ZTJS_OPTS = { $refStrategy: 'none', target: 'jsonSchema7' } as const;

const toJsonSchema = (schema: unknown): unknown =>
  // zod-to-json-schema типизирован под ZodSchema; контракт-схемы — реальные zod-объекты,
  // но мы не тянем zod-тип в этот пакет → cast.
  zodToJsonSchema(schema as never, ZTJS_OPTS);

const mapValues = (
  rec: Record<string, unknown>,
  fn: (v: unknown) => unknown,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(rec)) out[key] = fn(rec[key]);
  return out;
};

/** `manifest.json` — name/version + имена in/out событий. */
export const buildManifestJson = (name: string, version: string, contract: IContractLike): string =>
  `${JSON.stringify(
    {
      name,
      version,
      in: Object.keys(contract.in),
      out: Object.keys(contract.out),
    },
    null,
    2,
  )}\n`;

/** `schema.json` — каждое событие → инлайн json-schema (top-level `properties`). */
export const buildSchemaJson = (contract: IContractLike): string =>
  `${JSON.stringify(
    {
      in: mapValues(contract.in, toJsonSchema),
      out: mapValues(contract.out, toJsonSchema),
    },
    null,
    2,
  )}\n`;

/**
 * json-schema (7) → строка TS-типа. Поддерживает то, что выдаёт `zodToJsonSchema`
 * для типовых payload'ов: object / string / number / boolean / null / array / enum.
 * Неизвестное → `unknown`. Self-contained (без импортов) — пригодно для вендоринга.
 */
export const jsonSchemaToTs = (schema: unknown, indent = '  '): string => {
  if (!schema || typeof schema !== 'object') return 'unknown';
  const s = schema as Record<string, unknown>;

  if (Array.isArray(s.enum)) {
    return s.enum.map((v) => JSON.stringify(v)).join(' | ') || 'never';
  }
  if (s.const !== undefined) return JSON.stringify(s.const);

  const type = s.type;
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array': {
      const inner = jsonSchemaToTs(s.items, indent);
      // Оборачиваем union-элементы в скобки, чтобы `(a | b)[]` был корректен.
      return /[|&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
    }
    case 'object': {
      const props = (s.properties as Record<string, unknown>) ?? {};
      const required = new Set<string>(Array.isArray(s.required) ? (s.required as string[]) : []);
      const keys = Object.keys(props);
      if (keys.length === 0) return 'Record<string, never>';
      const inner = `${indent}  `;
      const entries = keys.map((k) => {
        const opt = required.has(k) ? '' : '?';
        return `${inner}${JSON.stringify(k)}${opt}: ${jsonSchemaToTs(props[k], inner)};`;
      });
      return `{\n${entries.join('\n')}\n${indent}}`;
    }
    default:
      return 'unknown';
  }
};

/** `contract.d.ts` — self-contained `InEvents` / `OutEvents` интерфейсы. */
export const buildContractDts = (contract: IContractLike): string => {
  const renderIface = (name: string, rec: Record<string, unknown>): string => {
    const keys = Object.keys(rec);
    if (keys.length === 0) return `export interface ${name} {}`;
    const lines = keys.map(
      (k) => `  ${JSON.stringify(k)}: ${jsonSchemaToTs(toJsonSchema(rec[k]))};`,
    );
    return `export interface ${name} {\n${lines.join('\n')}\n}`;
  };
  return [
    '// generated contract artifact (ADR 060 Phase 1) — do not edit',
    renderIface('InEvents', contract.in),
    '',
    renderIface('OutEvents', contract.out),
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

export const DEFINE_CONTRACT_IMPORT =
  "import { defineContract } from '@capsuletech/web-core/contract';";
// Матчит ТОЛЬКО реальный named-import: `import { … defineContract … } from`.
// `defineContract` — named export (default-import невалиден), так что named-формы
// достаточно. Прежний `/\bimport\b[^;]*\bdefineContract\b/` ложно срабатывал:
// `[^;]*` ест переносы строк → любой другой `import` (или слово в комментарии) +
// последующий bare `defineContract` пропускали инжект → ReferenceError в bundle.
const ALREADY_IMPORTED_RE = /import\s*\{[^}]*\bdefineContract\b[^}]*\}\s*from/;

/**
 * Инжектит import `defineContract`, если автор написал его как bare-глобал
 * (auto-import делает это в Vite-графе, но артефакт-конвейер вне графа —
 * как defineEndpoint-инжект в CapsuleRegistryPlugin). Идемпотентно.
 */
export const ensureDefineContractImport = (source: string): string =>
  ALREADY_IMPORTED_RE.test(source) ? source : `${DEFINE_CONTRACT_IMPORT}\n${source}`;

/** Читает name/version из `apps/<app>/package.json`; безопасные дефолты при отсутствии. */
const readAppMeta = (appRoot: string): { name: string; version: string } => {
  const pkgPath = join(appRoot, 'package.json');
  const fallback = { name: basename(appRoot), version: '0.0.0' };
  if (!existsSync(pkgPath)) return fallback;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string; version?: string };
    return { name: pkg.name ?? fallback.name, version: pkg.version ?? fallback.version };
  } catch {
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// Bundle + eval
// ---------------------------------------------------------------------------

/**
 * Бандлит `contract.ts` в self-contained ESM через esbuild (zod инлайнится),
 * затем eval'ит бандл через data:-URL dynamic import и возвращает объект контракта.
 *
 * Один проход даёт оба результата: текст бандла (= `contract.mjs`) и живой объект
 * (для manifest/schema/d.ts). Без temp-файлов, без jiti-стабов глобалов.
 */
export const bundleAndEvalContract = async (
  contractPath: string,
  appRoot: string,
): Promise<{ bundledCode: string; contract: IContractLike }> => {
  const rawSource = readFileSync(contractPath, 'utf-8');
  const source = ensureDefineContractImport(rawSource);

  const result = await esbuild({
    stdin: {
      contents: source,
      resolveDir: appRoot,
      sourcefile: 'contract.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    legalComments: 'none',
  });

  const bundledCode = result.outputFiles[0]?.text ?? '';
  const dataUrl = `data:text/javascript;base64,${Buffer.from(bundledCode, 'utf-8').toString('base64')}`;
  const mod = (await import(dataUrl)) as { default?: unknown };
  const contract = (mod.default ?? mod) as IContractLike;

  if (!contract || typeof contract !== 'object' || !contract.in || !contract.out) {
    throw new Error(
      `[capsule:contract] contract.ts default export is not a valid contract ({ in, out }) — got ${typeof contract}`,
    );
  }

  return { bundledCode, contract };
};

/**
 * Полный конвейер: путь к contract.ts → карта 4 файлов артефакта.
 * Возвращает `null`, если `contract.ts` отсутствует (no-op для не-ремоут аппов).
 */
export const produceArtifacts = async (appRoot: string): Promise<ContractArtifactFiles | null> => {
  const contractPath = join(appRoot, 'contract.ts');
  if (!existsSync(contractPath)) return null;

  const { name, version } = readAppMeta(appRoot);
  const { bundledCode, contract } = await bundleAndEvalContract(contractPath, appRoot);

  const files: ContractArtifactFiles = new Map();
  files.set('manifest.json', buildManifestJson(name, version, contract));
  files.set('schema.json', buildSchemaJson(contract));
  files.set('contract.d.ts', buildContractDts(contract));
  files.set('contract.mjs', bundledCode);
  return files;
};

// ---------------------------------------------------------------------------
// Dev middleware helpers
// ---------------------------------------------------------------------------

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
};

const contentTypeFor = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  const ext = dot >= 0 ? fileName.slice(dot) : '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
};

/** Извлекает имя файла артефакта из URL запроса (учитывая base-префикс и query). */
export const matchContractRequest = (url: string | undefined): string | null => {
  if (!url) return null;
  const m = url.match(/\/\.capsule\/contract\/([^/?#]+)/);
  return m ? m[1] : null;
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export interface IContractArtifactPluginOpts {
  /** Абсолютный путь к `apps/<app>/` (Vite `root` берётся из `.capsule/`). */
  appRoot: string;
}

/**
 * Vite-плагин. Эмитит контракт-артефакт в build (asset → dist) и раздаёт его в
 * dev (middleware). No-op без `apps/<app>/contract.ts`.
 */
export const ContractArtifactPlugin = ({ appRoot }: IContractArtifactPluginOpts): Plugin => {
  const contractPath = join(appRoot, 'contract.ts');

  return {
    name: 'capsule:contract-artifact',

    // --- build: эмит артефакта в dist/.capsule/contract/* ---
    async generateBundle() {
      const files = await produceArtifacts(appRoot);
      if (!files) return;
      for (const [fileName, source] of files) {
        this.emitFile({
          type: 'asset',
          fileName: `.capsule/contract/${fileName}`,
          source,
        });
      }
    },

    // --- dev: раздача /.capsule/contract/* из памяти ---
    async configureServer(server: ViteDevServer) {
      if (!existsSync(contractPath)) return;

      let cache: ContractArtifactFiles | null = null;
      const rebuild = async () => {
        try {
          cache = await produceArtifacts(appRoot);
        } catch (e) {
          server.config.logger.error(`[capsule:contract] build failed: ${String(e)}`);
          cache = null;
        }
      };

      await rebuild();

      // Rebuild на изменение contract.ts (и зависимостей контракта — грубо, по самому файлу).
      server.watcher.add(contractPath);
      server.watcher.on('change', (file) => {
        if (file.split(/[\\/]/).join('/').endsWith('/contract.ts')) void rebuild();
      });

      server.middlewares.use((req, res, next) => {
        const fileName = matchContractRequest(req.url);
        if (!fileName) return next();
        const body = cache?.get(fileName);
        if (body === undefined) {
          res.statusCode = 404;
          res.end(`contract artifact not found: ${fileName}`);
          return;
        }
        res.setHeader('Content-Type', contentTypeFor(fileName));
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(body);
      });
    },
  };
};
