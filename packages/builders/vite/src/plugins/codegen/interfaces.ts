/**
 * CodegenContext + SubGenerator contract.
 *
 * Base orchestrator creates a single CodegenContext per plugin instance and
 * passes it to every SubGenerator. SubGenerators are self-contained modules:
 * each owns its own state, knows which files it cares about (match), and
 * writes its outputs via ctx.writeOut / ctx.removeOut.
 *
 * Adding a new codegen concern = add one SubGenerator module + register it.
 * The orchestrator never needs to change.
 *
 * ADR 037: sub-generator architecture.
 */

import type { parse } from '@babel/parser';
import type { names } from '@nx/devkit';

/**
 * Three-state result of loadAppConfig().
 *
 * - ok:      file loaded successfully; config contains the parsed AppConfigShape.
 * - missing: file does not exist; sub-generators should perform cleanup (removeOut).
 * - error:   exception during load; sub-generators should log the error and keep
 *            any previously generated file intact (do NOT removeOut on transient errors).
 */
export type AppConfigResult =
  | { status: 'ok'; config: AppConfigShape }
  | { status: 'missing' }
  | { status: 'error'; error: unknown; configPath: string };

/** Shape of a loaded capsule.app.ts config (subset used by codegen). */
export interface AppConfigShape {
  meta?: { tags?: readonly string[] };
  aliases?: Record<string, readonly string[]>;
  packages?: ReadonlyArray<string | { use: string; as?: string }>;
  access?: Record<string, readonly string[]>;
  auth?: { session?: { storage?: 'local' | 'memory'; key?: string } };
  docs?: {
    /**
     * Include the root vault docs.json from @capsuletech/web-docs.
     * Entry key: 'root'.
     */
    rootVault?: boolean;
    /**
     * Explicit list of package names whose ./docs.json export to include.
     * e.g. ['@capsuletech/web-ui']
     * Packages without a ./docs.json export are skipped with a warning.
     */
    packages?: ReadonlyArray<string>;
  };
}

/** Babel AST returned from ctx.parse() */
export type Ast = ReturnType<typeof parse>;

/** Shared context passed to every SubGenerator call. */
export interface CodegenContext {
  /** Absolute path to apps/<app>/src/ */
  readonly watchDir: string;
  /** Absolute path to apps/<app>/.capsule/ */
  readonly capsuleRoot: string;
  /** Absolute path to apps/<app>/capsule.app.ts */
  readonly appConfigPath: string;

  /**
   * Diff-write: writes content to absPath only if content changed.
   * Creates parent directories as needed.
   */
  writeOut(absPath: string, content: string): void;

  /**
   * Remove a file if it exists. Used for legacy cleanup and unlink events.
   */
  removeOut(absPath: string): void;

  /**
   * Shared Babel parser. isTs should be true for .ts / .tsx files.
   * Returns a Babel File AST.
   */
  parse(source: string, isTs: boolean): Ast;

  /**
   * @nx/devkit `names()` helper.
   * Returns { className, ... } for a string segment.
   */
  names(s: string): ReturnType<typeof names>;

  /**
   * Load (or return cached) capsule.app.ts config.
   * Uses jiti for fresh evaluation on every call (no stale cache).
   *
   * Three-state return:
   *   { status: 'ok', config }    — file loaded and parsed successfully
   *   { status: 'missing' }       — file does not exist (valid edge case)
   *   { status: 'error', error, configPath } — exception during load
   *
   * Sub-generators should:
   *   - On 'missing': perform cleanup (removeOut) — same as before.
   *   - On 'error': log a warning via ctx.logger and keep existing output intact
   *     (do NOT call removeOut — transient errors should not destroy previous state).
   *   - On 'ok': proceed normally.
   */
  loadAppConfig(): AppConfigResult;

  /**
   * Optional Vite logger. Available when the plugin runs inside a Vite plugin context.
   * Falls back to console if not provided (e.g. in tests).
   */
  logger?: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}

/**
 * A self-contained code-generation unit.
 *
 * Sub-generators are registered with the base orchestrator once and
 * thereafter receive events from the single unified src/** watcher.
 *
 * Lifecycle (per plugin invocation):
 *   1. initialScan: orchestrator calls onEvent('add', file, ctx) for every
 *      file that matches(). Then calls flush(ctx, true).
 *   2. Incremental: watcher fires → orchestrator calls onEvent(...) for
 *      matching sub-gens → calls flush on dirty ones (in order).
 *   3. appConfig change: orchestrator detects capsule.app.ts change →
 *      calls onAppConfigChange(ctx) on every sub-gen that implements it →
 *      calls flush on dirty ones.
 *
 * Contract invariants:
 *   - Sub-generators MUST NOT perform I/O outside ctx.writeOut / ctx.removeOut.
 *   - onEvent MUST be idempotent: calling add twice for the same file = same
 *     state as calling it once.
 *   - flush MUST NOT throw; errors should be logged and skipped.
 *   - order determines flush sequence: lower order = flushed first.
 */
export interface SubGenerator {
  /** Unique identifier. Used for debug logging and error attribution. */
  readonly id: string;

  /**
   * Returns true if this sub-generator cares about the given absolute file path.
   * Called for every event before onEvent is dispatched.
   */
  match(file: string): boolean;

  /**
   * Called for every watched event on files that match().
   *
   * Sub-generator updates its internal state (e.g. adds/removes a leaf entry).
   * Returns true if state changed and flush() should be called.
   *
   * Returning false skips flush — use this when the event is a no-op
   * (e.g. 'change' event on a file that doesn't affect codegen output).
   */
  onEvent(
    ev: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir',
    file: string,
    ctx: CodegenContext,
  ): boolean;

  /**
   * Write all pending outputs (only if dirty or forced).
   * Must be idempotent: flush(ctx, false) when not dirty = no-op.
   *
   * @param ctx  shared codegen context
   * @param forced  true during initialScan — write even if dirty flag is false
   */
  flush(ctx: CodegenContext, forced?: boolean): void;

  /**
   * Optional: called when capsule.app.ts changes.
   * Return true if the sub-generator is now dirty and needs flush.
   */
  onAppConfigChange?(ctx: CodegenContext): boolean;

  /**
   * Optional: contribute a phase + importPath to the bootstrap.tsx import list.
   * Called during flush by the BootstrapSubGenerator.
   * Return null if this sub-generator has no bootstrap contribution.
   */
  bootstrap?(ctx: CodegenContext): { phase: 'globals' | 'subsystems' | 'render'; importPath: string } | null;

  /**
   * Optional: Vite transform hook contribution.
   * Called by the base plugin's transform hook — first non-null result wins.
   */
  transform?(
    code: string,
    id: string,
    ctx: CodegenContext,
  ): { code: string; map: null } | null;

  /**
   * Optional: Vite config hook contribution.
   * Results are shallow-merged into the base config() return value.
   */
  config?(ctx: CodegenContext): Partial<import('vite').UserConfig> | null;

  /**
   * Flush order. Lower = flushed first.
   * Default: 100.
   *
   * Ordering:
   *   10  — barrel-registry (wrappers, no deps on other sub-gens)
   *   20  — endpoints (depends on nothing)
   *   30  — app-config (depends on packages being loaded)
   *   40  — packages (can run in parallel with app-config; listed after for clarity)
   *   90  — bootstrap (must run LAST — assembles import list from other sub-gens)
   */
  readonly order: number;
}
