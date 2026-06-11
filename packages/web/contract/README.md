# @capsuletech/web-contract

Leaf-протокол контрактов capsule (zero-dep). Компоненты `@capsuletech/web-ui` карманят контракты (props/variants/styleSlots/data/events/accepts-children); редакторы / demo-стенд / тесты — ПОТРЕБИТЕЛИ через `collectContracts`. Также — место для cross-domain capability контрактов per ADR 047 D2.  ·  zone: **runtime**  ·  status: **alpha (0.0.0)**

## Install

```bash
pnpm add @capsuletech/web-contract
# peer deps:
pnpm add solid-js
```

## Minimum usage

```ts
// Компонент карманит контракт:
import type { IComponentContract } from '@capsuletech/web-contract';

export const ButtonContract: IComponentContract = {
  name: 'Button',
  props: { intent: { type: 'enum', values: ['primary', 'ghost'] } },
  variants: ['intent', 'size'],
  events: ['onClick'],
};

// Cross-domain capability (ADR 047 D2):
import type { Accessor } from 'solid-js';

export interface IAuthCapability {
  isAuthed: Accessor<boolean>;
  viewer: Accessor<IViewer | null>;
}
```

## Docs

- AI-anchor: [`docs/_meta/web-contract.md`](../../../docs/_meta/web-contract.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../docs/_meta/web-zones/runtime.md)
- Domain canon (no horizontal): [`docs/_meta/web-zones/domain.md`](../../../docs/_meta/web-zones/domain.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 047 D2 (no horizontal between domain) + D3 (vendor transparency).
