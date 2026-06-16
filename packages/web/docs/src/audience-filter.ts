import type { IAudience } from '@capsuletech/docs-builder';

/**
 * Body-level audience filter — strips `<!-- audience: X -->...<!-- /audience -->`
 * blocks whose audience set does NOT intersect the requested audience.
 *
 * Per docs-system canon §3:
 *   - Block syntax: `<!-- audience: agent,dev -->...<!-- /audience -->`
 *   - Inline syntax: `<!-- audience: agent --> inline <!-- /audience -->`
 *
 * If `requested` is empty/undefined, no filtering — full body returned with
 * audience-comment markers stripped (decorative comments don't render).
 */
export const filterBodyByAudience = (body: string, requested?: IAudience[]): string => {
  const want = requested && requested.length > 0 ? new Set(requested) : null;

  const blockRx = /<!--\s*audience:\s*([a-z, ]+?)\s*-->([\s\S]*?)<!--\s*\/audience\s*-->/g;

  return body.replace(blockRx, (_full, audienceList: string, content: string) => {
    const list = audienceList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as IAudience[];

    if (!want) return content;

    const matches = list.some((a) => want.has(a));
    return matches ? content : '';
  });
};