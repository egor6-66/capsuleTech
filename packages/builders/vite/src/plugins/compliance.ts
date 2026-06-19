import {
  check,
  formatViolations,
  type ICheckOptions,
  type IViolation,
} from '@capsuletech/compliance';
import type { Plugin } from 'vite';

export interface ICompliancePluginOptions extends Omit<ICheckOptions, 'aliasKeys'> {
  /**
   * Global fallback mode when per-kind severity is not configured.
   * `warn` — all violations are logged; dev-server never fails.
   * `error` — all violations fail the build (overrides per-kind severity).
   *
   * Since L7 (2026-06-14) the preferred approach is per-kind severity via
   * `ICheckOptions.severity`. This `mode` field controls violations that reach
   * the plugin after severity filtering:
   *   - violations with `severity: 'error'` always call `this.error()`.
   *   - violations with `severity: 'warn'` call `this.warn()` unless mode='error'.
   *
   * Default: `'warn'` — dev-server logs errors but does NOT block HMR overlay
   * for warn-severity violations. Structural errors (app-package-import /
   * disallowed-import) still produce `this.error()` via per-kind severity.
   */
  mode?: 'warn' | 'error';
  /**
   * Mutable-источник зарегистрированных алиасов. AppConfigPlugin записывает сюда `aliasKeys`
   * после загрузки `capsule.app.ts`; Compliance читает на каждом `transform`.
   */
  appConfigState?: { aliasKeys: Set<string> };
  /**
   * Side-channel для каждой violation — потоковая dev-диагностика (DevDiagnosticsPlugin).
   * Вызывается на каждом transform с массивом violations (или пустым массивом если файл
   * прошёл проверку — это сигнал для cleanup в потоке).
   *
   * НЕ влияет на основной flow (`this.warn`/`this.error` остаются). Если callback падает —
   * исключение поглощается, основной transform продолжает.
   */
  onDiagnostic?: (file: string, violations: IViolation[]) => void;
}

export const CompliancePlugin = (opts: ICompliancePluginOptions = {}): Plugin => {
  const globalMode = opts.mode ?? 'warn';

  return {
    name: 'capsule-compliance',
    enforce: 'pre',
    transform(code, id) {
      const violations = check(id, code, {
        ...opts,
        aliasKeys: opts.appConfigState?.aliasKeys,
      });
      // Side-channel for streaming diagnostics. Always called — empty array
      // signals "file is clean" so the consumer can cleanup previous entries.
      if (opts.onDiagnostic) {
        try {
          opts.onDiagnostic(id, violations);
        } catch {
          /* dev-diagnostics is best-effort; transform must not fail */
        }
      }
      if (violations.length === 0) return null;

      // Split by effective severity stamped in IViolation.severity.
      const errors = violations.filter((v) => v.severity === 'error');
      const warns = violations.filter((v) => v.severity === 'warn');

      // Always log warnings (non-blocking).
      if (warns.length > 0) {
        this.warn(formatViolations(warns));
      }

      // Structural errors: fail build / show overlay.
      if (errors.length > 0) {
        if (globalMode === 'warn') {
          // Dev-server: log errors prominently but don't block HMR.
          // CI uses compliance:check script (non-zero exit), not Vite build.
          const errMsg = formatViolations(errors);
          this.warn(`[STRUCTURAL ERROR — CI will fail]\n${errMsg}`);
        } else {
          // mode='error' or explicit upgrade: fail the build.
          this.error(formatViolations(errors));
        }
      }

      return null;
    },
  };
};
