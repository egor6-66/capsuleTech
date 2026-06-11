# @capsuletech/web-date

Date/time utility layer для capsule: pure converters + range filters + активная локаль. Engine: date-fns v4.  ·  zone: **runtime**  ·  status: **alpha (0.1.0)**

No UI (date pickers живут в `@capsuletech/web-ui` через Kobalte). No reactivity (yet).

## Install

```bash
pnpm add @capsuletech/web-date
# direct dep:
pnpm add date-fns
```

## Minimum usage

```ts
import { toIso, fromIso, isInRange } from '@capsuletech/web-date';

const date = fromIso('2026-06-11T10:00:00Z');
const iso  = toIso(date);

isInRange(date, { from: '2026-06-01', to: '2026-06-30' });  // true
```

## Stack

- [date-fns 4](https://date-fns.org/) — main engine (external, peer-style).

## Docs

- AI-anchor: [`docs/_meta/web-date.md`](../../../docs/_meta/web-date.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../docs/_meta/web-zones/runtime.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
