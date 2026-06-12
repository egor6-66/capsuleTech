# @capsuletech/web-ui

Capsule UI-kit: stateless primitives (Button/Input/Card/Field/Layout/...) + composites (DataTable, DropdownMenu).  ·  zone: **kit**  ·  status: **stable**

Polymorphic через Kobalte `Polymorphic`, variants через CVA + `createStyle` (web-style), themed tokens only. Внутренний weight-gradient L0 (presentational) / L1 (interactive) — см. AI-anchor.

## Install

```bash
pnpm add @capsuletech/web-ui
# peer deps (требуются в host'е):
pnpm add solid-js @capsuletech/web-style @kobalte/core
# опционально для table-composite:
pnpm add @tanstack/solid-table @tanstack/solid-virtual
```

## Minimum usage

```tsx
import { Button, Card, Typography } from '@capsuletech/web-ui';

const Hello = () => (
  <Card>
    <Typography variant="h2">Hello capsule</Typography>
    <Button intent="primary">Click me</Button>
  </Card>
);
```

Внутри capsule-аппа примитивы доступны как глобал `Ui.*` через `@capsuletech/web-core/ui-kit/imports.tsx` — пиши `<Ui.Button>` без импорта (в Views / Widgets / Shapes).

## Subpath exports

Каждый primitive имеет subpath для tree-shake'а:

- `/button`, `/card`, `/field`, `/input`, `/label`, `/list`, `/typography` — L0 presentational + native control.
- `/accordion`, `/dropdown`, `/select`, `/slider`, `/toggle`, `/tooltip` — L1 interactive (Kobalte).
- `/skeleton`, `/spinner`, `/separator`, `/slot` — featherweight loaders + Polymorphic.
- `/layout`, `/grid`, `/flex`, `/matrix` — layout namespace.
- `/dataTable`, `/previewCard` — composites.
- `/icons`, `/wrappers` — служебные.

Импорт через subpath даёт минимальный bundle: `import { Button } from '@capsuletech/web-ui/button'`.

## Storybook

```bash
pnpm --filter @capsuletech/web-ui storybook   # localhost:6006
```

## Docs

- AI-anchor (architecture + L0/L1 gradient + manifest schema): [`docs/_meta/web-ui.md`](../../../docs/_meta/web-ui.md)
- Zone canon: [`docs/_meta/web-zones/kit.md`](../../../docs/_meta/web-zones/kit.md)
- OWNERSHIP (owner-agent contract): [`./OWNERSHIP.md`](./OWNERSHIP.md)
- User guides: [`docs/09-packages/ui/`](../../../docs/09-packages/ui/)
- ADR 042 (token canon), ADR 044 (heavy=pkg / light=kit), ADR 047 (zones).
