import { describe, expect, it } from 'vitest';

// Verify that the icons subpath re-exports lucide-solid icons correctly.
// We import directly from source (tsconfig paths resolve @capsuletech/web-ui/icons
// to src/icons/index.ts in the workspace).
import * as Icons from '../index';

describe('icons subpath', () => {
  it('exports named icon components', () => {
    // A few stable icons present since lucide-solid v0.x
    expect(typeof Icons.ChevronRight).toBe('function');
    expect(typeof Icons.X).toBe('function');
    expect(typeof Icons.Settings).toBe('function');
    expect(typeof Icons.Loader2).toBe('function');
  });

  it('exports are functions (Solid components)', () => {
    const sampleNames = ['Plus', 'Minus', 'Check', 'AlertCircle'] as const;
    for (const name of sampleNames) {
      expect(
        typeof (Icons as Record<string, unknown>)[name],
        `${name} should be a function`,
      ).toBe('function');
    }
  });
});
