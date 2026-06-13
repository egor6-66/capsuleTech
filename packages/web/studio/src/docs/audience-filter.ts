import type { Audience } from './types';

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
export const filterBodyByAudience = (body: string, requested?: Audience[]): string => {
  const want = requested && requested.length > 0 ? new Set(requested) : null;

  // Matches a balanced block (possibly multi-line):
  //   <!-- audience: a,b,c -->  content  <!-- /audience -->
  // Audience values are normalized via comma-split + trim.
  const blockRx = /<!--\s*audience:\s*([a-z, ]+?)\s*-->([\s\S]*?)<!--\s*\/audience\s*-->/g;

  return body.replace(blockRx, (_full, audienceList: string, content: string) => {
    const list = audienceList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as Audience[];

    // No requested filter → keep content, strip markers.
    if (!want) return content;

    // Any-of intersection → keep content, strip markers.
    const matches = list.some((a) => want.has(a));
    return matches ? content : '';
  });
};
