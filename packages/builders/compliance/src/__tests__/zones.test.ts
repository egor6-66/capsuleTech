import { describe, expect, it } from 'vitest';
import { check } from '../check';
import {
  classifyZone,
  extractZonePackage,
  isZoneImportAllowed,
  PACKAGE_TO_ZONE,
  ZONE_ALLOWED_DEPS,
} from '../zones';

/**
 * Phase D3 — zone-canon compliance per ADR 047 D1/D2.
 *
 * Tests group around:
 *   1. classifyZone — path → Zone.
 *   2. extractZonePackage — path → package directory name.
 *   3. PACKAGE_TO_ZONE + ZONE_ALLOWED_DEPS tables — canon coverage.
 *   4. check() — end-to-end zone-import violation emission.
 */

// ---------------------------------------------------------------------------
// classifyZone
// ---------------------------------------------------------------------------

describe('classifyZone — basic path classification', () => {
  it('classifies kit zone', () => {
    expect(classifyZone('/repo/packages/web/kit/ui/src/index.ts')).toBe('kit');
  });

  it('classifies runtime zone', () => {
    expect(classifyZone('/repo/packages/web/runtime/core/src/wrappers/widget.tsx')).toBe(
      'runtime',
    );
  });

  it('classifies domain zone', () => {
    expect(classifyZone('/repo/packages/web/domain/auth/src/role/index.ts')).toBe('domain');
  });

  it('classifies boost zone', () => {
    expect(classifyZone('/repo/packages/web/boost/layout/src/matrix/matrix.tsx')).toBe('boost');
  });

  it('classifies design-time zone', () => {
    expect(classifyZone('/repo/packages/web/design-time/creator/src/index.ts')).toBe('design-time');
  });

  it('returns null for paths outside packages/web/', () => {
    expect(classifyZone('/repo/apps/ewc/src/widgets/foo.tsx')).toBeNull();
    expect(classifyZone('/repo/packages/builders/vite/src/index.ts')).toBeNull();
    expect(classifyZone('/repo/packages/shared/zod/src/index.ts')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(classifyZone('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractZonePackage
// ---------------------------------------------------------------------------

describe('extractZonePackage — package directory extraction', () => {
  it('extracts package dir for each zone', () => {
    expect(
      extractZonePackage('/repo/packages/web/kit/ui/src/index.ts', 'kit'),
    ).toBe('ui');
    expect(
      extractZonePackage('/repo/packages/web/runtime/core/src/x.ts', 'runtime'),
    ).toBe('core');
    expect(
      extractZonePackage('/repo/packages/web/boost/layout/src/x.ts', 'boost'),
    ).toBe('layout');
    expect(
      extractZonePackage('/repo/packages/web/domain/auth/src/x.ts', 'domain'),
    ).toBe('auth');
  });

  it('returns null when zone is null', () => {
    expect(extractZonePackage('/repo/packages/web/kit/ui/src/x.ts', null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PACKAGE_TO_ZONE coverage
// ---------------------------------------------------------------------------

describe('PACKAGE_TO_ZONE — canon coverage', () => {
  it('lists web-ui in kit', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/web-ui']).toBe('kit');
  });

  it('lists web-core in runtime', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/web-core']).toBe('runtime');
  });

  it('lists web-auth in domain', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/web-auth']).toBe('domain');
  });

  it('lists boost-layout in boost', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/boost-layout']).toBe('boost');
  });

  it('lists studio in design-time', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/studio']).toBe('design-time');
  });

  it('omits shared-infra packages (allowed everywhere)', () => {
    expect(PACKAGE_TO_ZONE['@capsuletech/shared-zod']).toBeUndefined();
    expect(PACKAGE_TO_ZONE['@capsuletech/vite-builder']).toBeUndefined();
    expect(PACKAGE_TO_ZONE['@capsuletech/cli']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isZoneImportAllowed
// ---------------------------------------------------------------------------

describe('isZoneImportAllowed — canon rules', () => {
  it('allows kit → runtime (web-style peer)', () => {
    expect(
      isZoneImportAllowed('kit', '@capsuletech/web-ui', 'runtime', '@capsuletech/web-style'),
    ).toBe(true);
  });

  it('forbids kit → boost', () => {
    expect(
      isZoneImportAllowed('kit', '@capsuletech/web-ui', 'boost', '@capsuletech/boost-layout'),
    ).toBe(false);
  });

  it('allows runtime → kit', () => {
    expect(
      isZoneImportAllowed('runtime', '@capsuletech/web-core', 'kit', '@capsuletech/web-ui'),
    ).toBe(true);
  });

  it('forbids runtime → domain', () => {
    expect(
      isZoneImportAllowed('runtime', '@capsuletech/web-access', 'domain', '@capsuletech/web-auth'),
    ).toBe(false);
  });

  it('allows boost → kit + runtime', () => {
    expect(
      isZoneImportAllowed('boost', '@capsuletech/boost-layout', 'kit', '@capsuletech/web-ui'),
    ).toBe(true);
    expect(
      isZoneImportAllowed('boost', '@capsuletech/boost-layout', 'runtime', '@capsuletech/web-core'),
    ).toBe(true);
  });

  it('forbids boost → domain', () => {
    expect(
      isZoneImportAllowed('boost', '@capsuletech/boost-layout', 'domain', '@capsuletech/web-shell'),
    ).toBe(false);
  });

  it('allows domain → kit + runtime + boost', () => {
    expect(
      isZoneImportAllowed('domain', '@capsuletech/web-auth', 'kit', '@capsuletech/web-ui'),
    ).toBe(true);
    expect(
      isZoneImportAllowed('domain', '@capsuletech/web-shell', 'boost', '@capsuletech/boost-layout'),
    ).toBe(true);
  });

  it('forbids cross-domain (domain → another domain)', () => {
    expect(
      isZoneImportAllowed('domain', '@capsuletech/web-shell', 'domain', '@capsuletech/web-auth'),
    ).toBe(false);
  });

  it('allows design-time → anything', () => {
    expect(
      isZoneImportAllowed(
        'design-time',
        '@capsuletech/studio',
        'kit',
        '@capsuletech/web-ui',
      ),
    ).toBe(true);
    expect(
      isZoneImportAllowed(
        'design-time',
        '@capsuletech/studio',
        'domain',
        '@capsuletech/web-auth',
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ZONE_ALLOWED_DEPS table shape
// ---------------------------------------------------------------------------

describe('ZONE_ALLOWED_DEPS — table shape', () => {
  it('each zone allows itself', () => {
    for (const zone of ['kit', 'runtime', 'boost', 'domain', 'design-time'] as const) {
      expect(ZONE_ALLOWED_DEPS[zone].has(zone)).toBe(true);
    }
  });

  it('kit forbids boost and domain', () => {
    expect(ZONE_ALLOWED_DEPS.kit.has('boost')).toBe(false);
    expect(ZONE_ALLOWED_DEPS.kit.has('domain')).toBe(false);
    expect(ZONE_ALLOWED_DEPS.kit.has('design-time')).toBe(false);
  });

  it('runtime forbids boost / domain / design-time', () => {
    expect(ZONE_ALLOWED_DEPS.runtime.has('boost')).toBe(false);
    expect(ZONE_ALLOWED_DEPS.runtime.has('domain')).toBe(false);
    expect(ZONE_ALLOWED_DEPS.runtime.has('design-time')).toBe(false);
  });

  it('boost forbids domain and design-time', () => {
    expect(ZONE_ALLOWED_DEPS.boost.has('domain')).toBe(false);
    expect(ZONE_ALLOWED_DEPS.boost.has('design-time')).toBe(false);
  });

  it('domain forbids design-time', () => {
    expect(ZONE_ALLOWED_DEPS.domain.has('design-time')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// check() — end-to-end zone-import violation emission
// ---------------------------------------------------------------------------

const KIT_PATH = '/repo/packages/web/kit/ui/src/primitives/button/button.tsx';
const RUNTIME_PATH = '/repo/packages/web/runtime/core/src/wrappers/widget.tsx';
const BOOST_PATH = '/repo/packages/web/boost/layout/src/matrix/matrix.tsx';
const DOMAIN_AUTH_PATH = '/repo/packages/web/domain/auth/src/role/index.ts';
const DOMAIN_SHELL_PATH = '/repo/packages/web/domain/shell/src/ui/header/header.tsx';
const DESIGN_TIME_PATH = '/repo/packages/web/design-time/creator/src/index.ts';

describe('check — zone canon enforcement', () => {
  it('kit importing kit subpath → allowed', () => {
    expect(
      check(KIT_PATH, "import { Flex } from '@capsuletech/web-ui/flex';"),
    ).toEqual([]);
  });

  it('kit importing runtime (web-style peer) → allowed', () => {
    expect(
      check(KIT_PATH, "import { cn } from '@capsuletech/web-style';"),
    ).toEqual([]);
  });

  it('kit importing boost → cross-zone violation', () => {
    const violations = check(
      KIT_PATH,
      "import { Matrix } from '@capsuletech/boost-layout';",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('cross-zone-import');
    expect(violations[0].zone).toBe('kit');
    expect(violations[0].source).toBe('@capsuletech/boost-layout');
  });

  it('runtime importing kit → allowed', () => {
    expect(
      check(RUNTIME_PATH, "import { Button } from '@capsuletech/web-ui/button';"),
    ).toEqual([]);
  });

  it('runtime importing domain → cross-zone violation', () => {
    const violations = check(
      RUNTIME_PATH,
      "import { useAuth } from '@capsuletech/web-auth';",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('cross-zone-import');
    expect(violations[0].zone).toBe('runtime');
  });

  it('boost importing kit + runtime → allowed', () => {
    expect(
      check(
        BOOST_PATH,
        `
import { Flex } from '@capsuletech/web-ui';
import { useCtx } from '@capsuletech/web-core';
`,
      ),
    ).toEqual([]);
  });

  it('boost importing domain → cross-zone violation', () => {
    const violations = check(
      BOOST_PATH,
      "import { Shell } from '@capsuletech/web-shell';",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('cross-zone-import');
    expect(violations[0].zone).toBe('boost');
  });

  it('domain importing kit + runtime + boost → allowed', () => {
    expect(
      check(
        DOMAIN_AUTH_PATH,
        `
import { Button } from '@capsuletech/web-ui';
import { useCtx } from '@capsuletech/web-core';
import { Matrix } from '@capsuletech/boost-layout';
`,
      ),
    ).toEqual([]);
  });

  it('domain → another domain → cross-zone violation (cross-domain canon, D2)', () => {
    const violations = check(
      DOMAIN_SHELL_PATH,
      "import { useAuth } from '@capsuletech/web-auth';",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('cross-zone-import');
    expect(violations[0].message).toContain('Cross-domain import');
    expect(violations[0].hint).toContain('web-contract');
  });

  it('domain importing same domain (subpath) → allowed', () => {
    expect(
      check(
        DOMAIN_SHELL_PATH,
        "import { something } from '@capsuletech/web-shell/ui';",
      ),
    ).toEqual([]);
  });

  it('design-time importing anything → allowed', () => {
    expect(
      check(
        DESIGN_TIME_PATH,
        `
import { Button } from '@capsuletech/web-ui';
import { useAuth } from '@capsuletech/web-auth';
import { Matrix } from '@capsuletech/boost-layout';
`,
      ),
    ).toEqual([]);
  });

  it('skips type-only imports', () => {
    expect(
      check(
        KIT_PATH,
        "import type { Matrix } from '@capsuletech/boost-layout';",
      ),
    ).toEqual([]);
  });

  it('skips non-capsule imports (vendors)', () => {
    expect(
      check(
        KIT_PATH,
        "import { createSignal } from 'solid-js';\nimport { cn } from 'class-variance-authority';",
      ),
    ).toEqual([]);
  });

  it('skips shared-infra @capsuletech packages (shared-zod, shared-utils)', () => {
    expect(
      check(
        KIT_PATH,
        "import { z } from '@capsuletech/shared-zod';\nimport { foo } from '@capsuletech/shared-utils';",
      ),
    ).toEqual([]);
  });

  it('emits violation on dynamic import() of cross-zone target', () => {
    const violations = check(
      KIT_PATH,
      "const mod = await import('@capsuletech/boost-layout');",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('cross-zone-import');
  });
});
