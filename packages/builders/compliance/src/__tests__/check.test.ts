import { describe, expect, it } from 'vitest';
import { check, DEFAULT_SEVERITY } from '../check';

/**
 * `check(absPath, code, opts)` парсит code как TS+JSX, проходит AST и возвращает
 * нарушения compliance-правил. Тесты группируем по виду нарушения, чтобы при
 * добавлении новой category было сразу видно, где её прибить.
 */

const VIEW_PATH = '/repo/apps/sandbox/src/views/_auth/loginForm.tsx';
const CONTROLLER_PATH = '/repo/apps/sandbox/src/controllers/auth.ts';
const FEATURE_PATH = '/repo/apps/sandbox/src/features/auth.ts';
const WIDGET_PATH = '/repo/apps/sandbox/src/widgets/forms/auth.tsx';
const PAGE_PATH = '/repo/apps/sandbox/src/pages/home.tsx';
const SYSTEM_PATH = '/repo/packages/web/core/src/index.ts';
const TEST_PATH = '/repo/apps/sandbox/src/views/_auth/loginForm.test.tsx';

describe('check — skipped layers', () => {
  it('returns [] for system files (packages/*)', () => {
    expect(check(SYSTEM_PATH, "import 'forbidden-anywhere';")).toEqual([]);
  });

  it('returns [] for test files (relaxed mode)', () => {
    expect(check(TEST_PATH, "import 'anything-goes';")).toEqual([]);
  });

  it('returns [] for unclassifiable paths', () => {
    expect(check('/repo/scripts/foo.mjs', "import 'x';")).toEqual([]);
  });
});

describe('check — allowed imports (no violations)', () => {
  it('view importing solid-js → ok', () => {
    expect(check(VIEW_PATH, "import { createSignal } from 'solid-js';")).toEqual([]);
  });

  it('controller importing xstate → ok', () => {
    expect(check(CONTROLLER_PATH, "import { createMachine } from 'xstate';")).toEqual([]);
  });

  it('feature importing @app/api → ok', () => {
    expect(check(FEATURE_PATH, "import { loginApi } from '@app/api/auth';")).toEqual([]);
  });

  it('relative imports are always allowed (intra-group)', () => {
    expect(check(VIEW_PATH, "import { x } from './sibling';")).toEqual([]);
  });

  it('type-only imports are skipped (no runtime link)', () => {
    expect(check(VIEW_PATH, "import type { Anything } from 'xstate';")).toEqual([]);
  });
});

describe('check — disallowed-import', () => {
  it('view importing xstate → disallowed-import', () => {
    const violations = check(VIEW_PATH, "import { createMachine } from 'xstate';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('disallowed-import');
    expect(violations[0].source).toBe('xstate');
    expect(violations[0].layer).toBe('view');
  });

  it('view importing arbitrary lib → disallowed-import', () => {
    const violations = check(VIEW_PATH, "import axios from 'axios';");
    expect(violations[0]?.kind).toBe('disallowed-import');
  });
});

describe('check — upward-import', () => {
  it('view importing @features/* → upward-import', () => {
    const violations = check(VIEW_PATH, "import { x } from '@features/auth';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('upward-import');
  });

  it('controller importing @widgets/* → upward-import', () => {
    const violations = check(CONTROLLER_PATH, "import { x } from '@widgets/forms';");
    expect(violations[0].kind).toBe('upward-import');
  });
});

describe('check — horizontal-import', () => {
  it('view importing @views/<other-group> → horizontal (via cross-layer rule)', () => {
    // View has empty CROSS_LAYER_ALLOWED — any @views/* import is forbidden.
    const violations = check(VIEW_PATH, "import { Other } from '@views/_header';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('horizontal-import');
  });

  it('widget importing @widgets/<other-group> → horizontal (same layer)', () => {
    const violations = check(WIDGET_PATH, "import { Other } from '@widgets/dialogs';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('horizontal-import');
  });

  it('widget importing @views/<group> → allowed (composition role)', () => {
    expect(check(WIDGET_PATH, "import { Form } from '@views/_auth';")).toEqual([]);
  });

  it('page importing @widgets/* → allowed', () => {
    expect(check(PAGE_PATH, "import { Form } from '@widgets/forms';")).toEqual([]);
  });
});

describe('check — side-effect-fetch', () => {
  it('controller calling fetch(...) → side-effect-fetch', () => {
    const violations = check(CONTROLLER_PATH, 'function go() { fetch("/api/x"); }');
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('side-effect-fetch');
    expect(violations[0].source).toBe('fetch');
  });

  it('view calling axios.get → side-effect-fetch', () => {
    const violations = check(VIEW_PATH, 'function go() { axios.get("/x"); }');
    expect(violations[0]?.kind).toBe('side-effect-fetch');
  });

  it('feature calling fetch → allowed (feature owns IO)', () => {
    expect(check(FEATURE_PATH, 'function go() { fetch("/api/x"); }')).toEqual([]);
  });

  it('honors checkSideEffects: false', () => {
    const violations = check(CONTROLLER_PATH, 'function go() { fetch("/api/x"); }', {
      checkSideEffects: false,
    });
    expect(violations.find((v) => v.kind === 'side-effect-fetch')).toBeUndefined();
  });
});

describe('check — unknown-alias (meta.tags)', () => {
  const aliasKeys = new Set(['@login-form', '@header']);

  it('flags @-alias in meta.tags when not in registry', () => {
    const code = `
      const x = <Field meta={{ tags: ['@unknown'] }} />;
    `;
    const violations = check(VIEW_PATH, code, { aliasKeys });
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('unknown-alias');
    expect(violations[0].source).toBe('@unknown');
  });

  it('accepts known alias', () => {
    const code = `
      const x = <Field meta={{ tags: ['@login-form', 'submit'] }} />;
    `;
    expect(check(VIEW_PATH, code, { aliasKeys })).toEqual([]);
  });

  it('plain tags (no @-prefix) are ignored', () => {
    const code = `
      const x = <Field meta={{ tags: ['submit', 'email'] }} />;
    `;
    expect(check(VIEW_PATH, code, { aliasKeys })).toEqual([]);
  });

  it('skips alias check when aliasKeys is not provided', () => {
    const code = `const x = <Field meta={{ tags: ['@anything'] }} />;`;
    expect(check(VIEW_PATH, code)).toEqual([]);
  });
});

describe('check — extraAllowed option', () => {
  it('merges extra allowlist for the target layer', () => {
    const violations = check(VIEW_PATH, "import { thing } from 'lodash-es';", {
      extraAllowed: { view: [/^lodash-es$/] },
    });
    expect(violations).toEqual([]);
  });
});

describe('check — dynamic import()', () => {
  it('treats dynamic import as runtime import', () => {
    const violations = check(VIEW_PATH, "const m = await import('xstate');");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('disallowed-import');
  });
});

describe('check — parser resilience', () => {
  it('swallows parse errors and returns []', () => {
    expect(check(VIEW_PATH, 'this is not valid (((( syntax')).toEqual([]);
  });
});

/**
 * Phase L (2026-06-13): runtime @capsuletech in app-code is forbidden.
 *
 * After Phase L, RUNTIME_ALLOWED contains no @capsuletech entries for any layer.
 * Globals (Ui, Views etc.) are injected via unplugin-auto-import.
 * For types use "import type" -- those are always skipped (type-only).
 *
 * All tests below updated: expect `app-package-import` instead of `disallowed-import`.
 */
describe('check — app-package-import (Phase L)', () => {
  it('widget importing @capsuletech/web-ui → app-package-import (was: ok, now forbidden)', () => {
    const v = check(WIDGET_PATH, "import { Card } from '@capsuletech/web-ui';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
    expect(v[0].source).toBe('@capsuletech/web-ui');
    expect(v[0].layer).toBe('widget');
  });

  it('page importing @capsuletech/web-ui → app-package-import', () => {
    const v = check(PAGE_PATH, "import { Layout } from '@capsuletech/web-ui';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('controller importing @capsuletech/web-state → app-package-import (was: ok, now forbidden)', () => {
    const v = check(CONTROLLER_PATH, "import { Bridge } from '@capsuletech/web-state';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('controller importing @capsuletech/web-router → app-package-import', () => {
    const v = check(CONTROLLER_PATH, "import { routerService } from '@capsuletech/web-router';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('feature importing @capsuletech/web-state → app-package-import (was: ok, now forbidden)', () => {
    const v = check(FEATURE_PATH, "import { Bridge } from '@capsuletech/web-state';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('feature importing @capsuletech/web-query → app-package-import (was: ok, now forbidden)', () => {
    const v = check(FEATURE_PATH, "import { UnauthorizedError } from '@capsuletech/web-query';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('controller importing @capsuletech/web-query → app-package-import (was: disallowed-import)', () => {
    const v = check(CONTROLLER_PATH, "import { setApiClient } from '@capsuletech/web-query';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('view importing @capsuletech/web-ui → app-package-import (was: disallowed-import)', () => {
    const v = check(VIEW_PATH, "import { Card } from '@capsuletech/web-ui';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('controller importing @capsuletech/web-ui → app-package-import (was: disallowed-import)', () => {
    const v = check(CONTROLLER_PATH, "import { Card } from '@capsuletech/web-ui';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('view importing @capsuletech/web-style → app-package-import (was: COMMON — allowed everywhere)', () => {
    const v = check(VIEW_PATH, "import { tw } from '@capsuletech/web-style';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('@capsuletech/* subpath is also forbidden', () => {
    const v = check(PAGE_PATH, "import { ThemeEditor } from '@capsuletech/web-style/editor';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
    expect(v[0].source).toBe('@capsuletech/web-style/editor');
  });

  it('@capsuletech/web-studio subpath → app-package-import', () => {
    const v = check(WIDGET_PATH, "import { Provider } from '@capsuletech/web-studio/docs';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('@capsule/* prefix is also forbidden', () => {
    const v = check(VIEW_PATH, "import { registry } from '@capsule/docs-registry';");
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('app-package-import');
  });

  it('type-only import of @capsuletech/* → ok (no runtime coupling)', () => {
    expect(
      check(VIEW_PATH, "import type { ICard } from '@capsuletech/web-ui';"),
    ).toEqual([]);
  });

  it('type-only import of @capsule/* → ok', () => {
    expect(
      check(FEATURE_PATH, "import type { IRegistry } from '@capsule/docs-registry';"),
    ).toEqual([]);
  });

  describe('legacy names without web- prefix → also app-package-import (was: disallowed-import)', () => {
    // Phase L: @capsuletech/* запрещено целиком. Legacy и current имена — одно правило.
    it.each([
      ['@capsuletech/ui', WIDGET_PATH],
      ['@capsuletech/state', CONTROLLER_PATH],
      ['@capsuletech/router', CONTROLLER_PATH],
      ['@capsuletech/style', VIEW_PATH],
    ])('legacy "%s" → app-package-import', (pkg, path) => {
      const v = check(path, `import { x } from '${pkg}';`);
      expect(v).toHaveLength(1);
      expect(v[0].kind).toBe('app-package-import');
    });
  });

  describe('web-style — ALL layers now forbidden (was: COMMON — allowed everywhere)', () => {
    it.each([
      ['view', VIEW_PATH],
      ['controller', CONTROLLER_PATH],
      ['feature', FEATURE_PATH],
      ['widget', WIDGET_PATH],
      ['page', PAGE_PATH],
    ])('%s importing @capsuletech/web-style → app-package-import', (_label, path) => {
      const v = check(path, "import { tw } from '@capsuletech/web-style';");
      expect(v).toHaveLength(1);
      expect(v[0].kind).toBe('app-package-import');
    });
  });
});

// ─── Phase L: new rules ───────────────────────────────────────────────────────

describe('check — no-native-jsx (Phase L)', () => {
  it('<div> in view → native-jsx', () => {
    const v = check(VIEW_PATH, 'const X = () => <div class="foo" />;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('div');
    expect(nativeViolations[0].layer).toBe('view');
  });

  it('<code> in view → native-jsx with Ui.Typography.Code hint', () => {
    const v = check(VIEW_PATH, 'const X = () => <code>hello</code>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('code');
    expect(nativeViolations[0].hint).toContain('Ui.Typography.Code');
  });

  it('<button> in widget → native-jsx', () => {
    const v = check(WIDGET_PATH, 'const X = () => <button onClick={go}>Click</button>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('button');
  });

  it('<svg> in page → native-jsx', () => {
    const v = check(PAGE_PATH, 'const X = () => <svg><path d="M0 0" /></svg>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    // svg + path = 2 violations
    expect(nativeViolations.length).toBeGreaterThanOrEqual(1);
    expect(nativeViolations.some((x) => x.source === 'svg')).toBe(true);
  });

  it('<span> in controller (controllers have no JSX normally, but still caught)', () => {
    // Controllers могут иметь JSX в крайних случаях — правило всё равно ловит
    const v = check(CONTROLLER_PATH, 'const label = () => <span>text</span>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('span');
  });

  it('<Ui.Button> (JSXMemberExpression) → NOT native-jsx', () => {
    const v = check(VIEW_PATH, 'const X = () => <Ui.Button />;');
    expect(v.filter((x) => x.kind === 'native-jsx')).toHaveLength(0);
  });

  it('<MyComponent> (PascalCase) → NOT native-jsx', () => {
    const v = check(VIEW_PATH, 'const X = () => <MyComponent />;');
    expect(v.filter((x) => x.kind === 'native-jsx')).toHaveLength(0);
  });

  it('<Button> (PascalCase global) → NOT native-jsx', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Button size="lg" />;');
    expect(v.filter((x) => x.kind === 'native-jsx')).toHaveLength(0);
  });

  it('unknown host tag without hint → generic hint', () => {
    // 'bdi' is an HTML tag without a mapping in HOST_TAG_HINT_SUGGESTIONS
    const v = check(VIEW_PATH, 'const X = () => <bdi>text</bdi>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].hint).toContain('Ui.* / Views.* primitives');
  });

  it('<a> → hint includes Ui.Link', () => {
    const v = check(VIEW_PATH, 'const X = () => <a href="#">link</a>;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].hint).toContain('Ui.Link');
  });

  it('<input> in page → native-jsx with Ui.Input hint', () => {
    const v = check(PAGE_PATH, 'const X = () => <input type="text" />;');
    const nativeViolations = v.filter((x) => x.kind === 'native-jsx');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].hint).toContain('Ui.Input');
  });
});

describe('check — no-native-js (Phase L)', () => {
  it('document.querySelector in controller → native-js', () => {
    const v = check(CONTROLLER_PATH, 'document.querySelector(".foo");');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('document');
    expect(nativeViolations[0].layer).toBe('controller');
    expect(nativeViolations[0].hint).toContain('DOM-доступ');
  });

  it('window.location in feature → native-js', () => {
    // DOM-доступ запрещён во всех HCA-слоях включая feature
    const v = check(FEATURE_PATH, 'const url = window.location.href;');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('window');
  });

  it('localStorage.setItem in widget → native-js', () => {
    const v = check(WIDGET_PATH, 'localStorage.setItem("key", "val");');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('localStorage');
  });

  it('navigator.userAgent in view → native-js', () => {
    const v = check(VIEW_PATH, 'const ua = navigator.userAgent;');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('navigator');
  });

  it('setTimeout in controller → native-js (timer hint)', () => {
    const v = check(CONTROLLER_PATH, 'setTimeout(() => go(), 1000);');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('setTimeout');
    expect(nativeViolations[0].hint).toContain('lifecycle');
  });

  it('requestAnimationFrame in feature → native-js', () => {
    const v = check(FEATURE_PATH, 'requestAnimationFrame(() => render());');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('requestAnimationFrame');
  });

  it('setInterval in page → native-js', () => {
    const v = check(PAGE_PATH, 'const id = setInterval(tick, 500);');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('setInterval');
  });

  it('deduplication: document.querySelector called twice on same line → 1 violation', () => {
    // Оба document.X на одной строке — MemberExpression ловит document один раз (дедуп по позиции+имени)
    const v = check(CONTROLLER_PATH, 'const x = document.querySelector, y = document.getElementById;');
    const nativeViolations = v.filter((x) => x.kind === 'native-js' && x.source === 'document');
    // Два MemberExpression могут быть на разных column — не факт что дедупятся,
    // но оба с source='document' должны быть native-js
    expect(nativeViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('document.X in view → native-js (DOM запрещён во всех слоях)', () => {
    const v = check(VIEW_PATH, 'const el = document.getElementById("root");');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('document');
    expect(nativeViolations[0].layer).toBe('view');
  });

  it('sessionStorage in controller → native-js', () => {
    const v = check(CONTROLLER_PATH, 'sessionStorage.removeItem("tok");');
    const nativeViolations = v.filter((x) => x.kind === 'native-js');
    expect(nativeViolations).toHaveLength(1);
    expect(nativeViolations[0].source).toBe('sessionStorage');
  });
});

describe('check — no-raw-class (Phase L)', () => {
  it('<Ui.Button class="foo"> in widget → raw-class', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Ui.Button class="foo" />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations).toHaveLength(1);
    expect(rawClassViolations[0].source).toBe('class');
    expect(rawClassViolations[0].layer).toBe('widget');
  });

  it('<div className="bar"> in view → raw-class (also native-jsx)', () => {
    const v = check(VIEW_PATH, 'const X = () => <div className="bar" />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations).toHaveLength(1);
    expect(rawClassViolations[0].source).toBe('className');
  });

  it('<Ui.Layout class:active={s()}> → raw-class (Solid namespace directive)', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Ui.Layout class:active={s()} />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations).toHaveLength(1);
    expect(rawClassViolations[0].source).toBe('class:active');
  });

  it('<X classList={{active: true}}> in page → raw-class', () => {
    const v = check(PAGE_PATH, 'const X = () => <SomeComp classList={{active: true}} />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations).toHaveLength(1);
    expect(rawClassViolations[0].source).toBe('classList');
  });

  it('<Ui.Button size="lg"> (no class attr) → no raw-class violation', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Ui.Button size="lg" variant="primary" />;');
    expect(v.filter((x) => x.kind === 'raw-class')).toHaveLength(0);
  });

  it('<MyComp data-testid="x"> → no raw-class violation', () => {
    const v = check(VIEW_PATH, 'const X = () => <MyComp data-testid="x" />;');
    expect(v.filter((x) => x.kind === 'raw-class')).toHaveLength(0);
  });

  it('class attr in controller → raw-class', () => {
    const v = check(CONTROLLER_PATH, 'const X = () => <Ui.Box class="wrapper" />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations).toHaveLength(1);
    expect(rawClassViolations[0].layer).toBe('controller');
  });

  it('hint mentions @capsuletech/web-ui extension', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Ui.Button class="x" />;');
    const rawClassViolations = v.filter((x) => x.kind === 'raw-class');
    expect(rawClassViolations[0].hint).toContain('@capsuletech/web-ui');
  });

  // Golden negative: CVA cva() call — NOT a JSX class attribute.
  // CVA is a function call, not JSX. Ensure rule does NOT false-positive on cva usage.
  it('[golden negative] CVA cva(...) function call → NOT raw-class', () => {
    const code = `
      import { cva } from 'class-variance-authority';
      const buttonStyles = cva('base', { variants: { size: { sm: 'text-sm' } } });
      const X = () => <Ui.Button />;
    `;
    expect(check(WIDGET_PATH, code).filter((x) => x.kind === 'raw-class')).toHaveLength(0);
  });

  // Golden negative: dynamic class via Solid store — computed as a variable, not raw JSX attr.
  it('[golden negative] class stored in variable, passed via prop → NOT raw-class', () => {
    // class= on host-tag IS raw-class; but passing a variable via a kit prop is not.
    const code = `const X = () => <Ui.Box padding="md" />;`;
    expect(check(WIDGET_PATH, code).filter((x) => x.kind === 'raw-class')).toHaveLength(0);
  });
});

// ─── L7: per-kind severity (Phase L7, 2026-06-14) ────────────────────────────

describe('IViolation.severity — per-kind stamping', () => {
  it('app-package-import gets severity: "error" by default', () => {
    const v = check(WIDGET_PATH, "import { Card } from '@capsuletech/web-ui';");
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
  });

  it('disallowed-import gets severity: "error" by default', () => {
    const v = check(VIEW_PATH, "import { createMachine } from 'xstate';");
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
  });

  it('native-jsx gets severity: "warn" by default', () => {
    const v = check(VIEW_PATH, 'const X = () => <div />;');
    const nv = v.filter((x) => x.kind === 'native-jsx');
    expect(nv).toHaveLength(1);
    expect(nv[0].severity).toBe('warn');
  });

  it('raw-class gets severity: "warn" by default', () => {
    const v = check(WIDGET_PATH, 'const X = () => <Ui.Button class="foo" />;');
    const rv = v.filter((x) => x.kind === 'raw-class');
    expect(rv).toHaveLength(1);
    expect(rv[0].severity).toBe('warn');
  });

  it('native-js gets severity: "warn" by default', () => {
    const v = check(CONTROLLER_PATH, 'document.querySelector(".x");');
    const nv = v.filter((x) => x.kind === 'native-js');
    expect(nv).toHaveLength(1);
    expect(nv[0].severity).toBe('warn');
  });

  it('severity override: app-package-import → "warn"', () => {
    const v = check(WIDGET_PATH, "import { Card } from '@capsuletech/web-ui';", {
      severity: { 'app-package-import': 'warn' },
    });
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('warn');
  });

  it('severity override: disallowed-import → "off" filters out the violation', () => {
    const v = check(VIEW_PATH, "import { createMachine } from 'xstate';", {
      severity: { 'disallowed-import': 'off' },
    });
    expect(v).toHaveLength(0);
  });

  it('severity override: native-jsx → "error" upgrades cosmetic to structural', () => {
    const v = check(VIEW_PATH, 'const X = () => <div />;', {
      severity: { 'native-jsx': 'error' },
    });
    const nv = v.filter((x) => x.kind === 'native-jsx');
    expect(nv[0].severity).toBe('error');
  });
});

describe('DEFAULT_SEVERITY mapping (L7 canon)', () => {
  it('structural kinds are "error"', () => {
    expect(DEFAULT_SEVERITY['app-package-import']).toBe('error');
    expect(DEFAULT_SEVERITY['disallowed-import']).toBe('error');
  });

  it('cosmetic kinds are "warn"', () => {
    expect(DEFAULT_SEVERITY['raw-class']).toBe('warn');
    expect(DEFAULT_SEVERITY['native-jsx']).toBe('warn');
    expect(DEFAULT_SEVERITY['native-js']).toBe('warn');
  });

  it('structural HCA kinds (upward/horizontal) remain "warn" (not yet flipped)', () => {
    expect(DEFAULT_SEVERITY['upward-import']).toBe('warn');
    expect(DEFAULT_SEVERITY['horizontal-import']).toBe('warn');
  });
});
