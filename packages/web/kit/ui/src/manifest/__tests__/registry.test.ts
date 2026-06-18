/**
 * Tests for `getContract` — manifest-co-located contract resolution.
 *
 * Verifies that:
 *   - known types with contracts resolve to the correct Contract instance;
 *   - types without a contract field return `undefined`;
 *   - unknown / nonexistent types return `undefined`.
 */

import { describe, expect, it } from 'vitest';
import { ButtonContract } from '../../primitives/button/button.contract';
import { CardContract } from '../../primitives/card/card.contract';
import { getContract } from '../registry';

describe('getContract', () => {
  it('returns ButtonContract for "ui.Button"', () => {
    const result = getContract('ui.Button');
    expect(result).toBe(ButtonContract);
  });

  it('returns CardContract for "ui.Card"', () => {
    const result = getContract('ui.Card');
    expect(result).toBe(CardContract);
  });

  it('returns undefined for a registered type without a contract ("ui.Spinner")', () => {
    // SpinnerManifest exists in registry but has no contract field.
    const result = getContract('ui.Spinner');
    expect(result).toBeUndefined();
  });

  it('returns undefined for an unknown type ("nonexistent.Type")', () => {
    const result = getContract('nonexistent.Type');
    expect(result).toBeUndefined();
  });
});
