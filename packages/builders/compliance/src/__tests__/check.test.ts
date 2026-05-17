import { describe, expect, it } from 'vitest';
import { check } from '../check';

/**
 * `check(absPath, code, opts)` парсит code как TS+JSX, проходит AST и возвращает
 * нарушения compliance-правил. Тесты группируем по виду нарушения, чтобы при
 * добавлении новой category было сразу видно, где её прибить.
 */

const ENTITY_PATH = '/repo/apps/sandbox/src/entities/_auth/loginForm.tsx';
const CONTROLLER_PATH = '/repo/apps/sandbox/src/controllers/auth.ts';
const FEATURE_PATH = '/repo/apps/sandbox/src/features/auth.ts';
const WIDGET_PATH = '/repo/apps/sandbox/src/widgets/forms/auth.tsx';
const PAGE_PATH = '/repo/apps/sandbox/src/pages/home.tsx';
const SYSTEM_PATH = '/repo/packages/web/core/src/index.ts';
const TEST_PATH = '/repo/apps/sandbox/src/entities/_auth/loginForm.test.tsx';

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
  it('entity importing solid-js → ok', () => {
    expect(check(ENTITY_PATH, "import { createSignal } from 'solid-js';")).toEqual([]);
  });

  it('controller importing xstate → ok', () => {
    expect(check(CONTROLLER_PATH, "import { createMachine } from 'xstate';")).toEqual([]);
  });

  it('feature importing @app/api → ok', () => {
    expect(check(FEATURE_PATH, "import { loginApi } from '@app/api/auth';")).toEqual([]);
  });

  it('widget importing @capsuletech/ui → ok', () => {
    expect(check(WIDGET_PATH, "import { Card } from '@capsuletech/ui';")).toEqual([]);
  });

  it('relative imports are always allowed (intra-group)', () => {
    expect(check(ENTITY_PATH, "import { x } from './sibling';")).toEqual([]);
  });

  it('type-only imports are skipped (no runtime link)', () => {
    expect(
      check(ENTITY_PATH, "import type { Anything } from 'xstate';"),
    ).toEqual([]);
  });
});

describe('check — disallowed-import', () => {
  it('entity importing xstate → disallowed-import', () => {
    const violations = check(ENTITY_PATH, "import { createMachine } from 'xstate';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('disallowed-import');
    expect(violations[0].source).toBe('xstate');
    expect(violations[0].layer).toBe('entity');
  });

  it('entity importing arbitrary lib → disallowed-import', () => {
    const violations = check(ENTITY_PATH, "import axios from 'axios';");
    expect(violations[0]?.kind).toBe('disallowed-import');
  });
});

describe('check — upward-import', () => {
  it('entity importing @features/* → upward-import', () => {
    const violations = check(ENTITY_PATH, "import { x } from '@features/auth';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('upward-import');
  });

  it('controller importing @widgets/* → upward-import', () => {
    const violations = check(CONTROLLER_PATH, "import { x } from '@widgets/forms';");
    expect(violations[0].kind).toBe('upward-import');
  });
});

describe('check — horizontal-import', () => {
  it('entity importing @entities/<other-group> → horizontal (via cross-layer rule)', () => {
    // Entity has empty CROSS_LAYER_ALLOWED — any @entities/* import is forbidden.
    const violations = check(ENTITY_PATH, "import { Other } from '@entities/_header';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('horizontal-import');
  });

  it('widget importing @widgets/<other-group> → horizontal (same layer)', () => {
    const violations = check(WIDGET_PATH, "import { Other } from '@widgets/dialogs';");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('horizontal-import');
  });

  it('widget importing @entities/<group> → allowed (composition role)', () => {
    expect(check(WIDGET_PATH, "import { Form } from '@entities/_auth';")).toEqual([]);
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

  it('entity calling axios.get → side-effect-fetch', () => {
    const violations = check(ENTITY_PATH, 'function go() { axios.get("/x"); }');
    expect(violations[0]?.kind).toBe('side-effect-fetch');
  });

  it('feature calling fetch → allowed (feature owns IO)', () => {
    expect(check(FEATURE_PATH, 'function go() { fetch("/api/x"); }')).toEqual([]);
  });

  it('honors checkSideEffects: false', () => {
    const violations = check(
      CONTROLLER_PATH,
      'function go() { fetch("/api/x"); }',
      { checkSideEffects: false },
    );
    expect(violations.find((v) => v.kind === 'side-effect-fetch')).toBeUndefined();
  });
});

describe('check — unknown-alias (meta.tags)', () => {
  const aliasKeys = new Set(['@login-form', '@header']);

  it('flags @-alias in meta.tags when not in registry', () => {
    const code = `
      const x = <Field meta={{ tags: ['@unknown'] }} />;
    `;
    const violations = check(ENTITY_PATH, code, { aliasKeys });
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('unknown-alias');
    expect(violations[0].source).toBe('@unknown');
  });

  it('accepts known alias', () => {
    const code = `
      const x = <Field meta={{ tags: ['@login-form', 'submit'] }} />;
    `;
    expect(check(ENTITY_PATH, code, { aliasKeys })).toEqual([]);
  });

  it('plain tags (no @-prefix) are ignored', () => {
    const code = `
      const x = <Field meta={{ tags: ['submit', 'email'] }} />;
    `;
    expect(check(ENTITY_PATH, code, { aliasKeys })).toEqual([]);
  });

  it('skips alias check when aliasKeys is not provided', () => {
    const code = `const x = <Field meta={{ tags: ['@anything'] }} />;`;
    expect(check(ENTITY_PATH, code)).toEqual([]);
  });
});

describe('check — extraAllowed option', () => {
  it('merges extra allowlist for the target layer', () => {
    const violations = check(ENTITY_PATH, "import { thing } from 'lodash-es';", {
      extraAllowed: { entity: [/^lodash-es$/] },
    });
    expect(violations).toEqual([]);
  });
});

describe('check — dynamic import()', () => {
  it('treats dynamic import as runtime import', () => {
    const violations = check(ENTITY_PATH, "const m = await import('xstate');");
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('disallowed-import');
  });
});

describe('check — parser resilience', () => {
  it('swallows parse errors and returns []', () => {
    expect(check(ENTITY_PATH, 'this is not valid (((( syntax')).toEqual([]);
  });
});
