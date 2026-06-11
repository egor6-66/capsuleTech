# @capsuletech/web-intl

i18n-слой capsule: реактивный locale/tenant-стейт + реестр copy-словарей (base + per-tenant) + резолвер строк по ключу с подстановкой.  ·  zone: **runtime**  ·  status: **alpha (0.1.0)**

## Install

```bash
pnpm add @capsuletech/web-intl
# peer deps:
pnpm add solid-js
```

## Minimum usage

```tsx
import { IntlProvider, useIntl, setLocale } from '@capsuletech/web-intl';

// Provider маунтится автоматически через web-core BaseProviders.
// В компонентах:
const Greeting = () => {
  const t = useIntl();
  return <p>{t('hello', { name: 'World' })}</p>;
};

// Сменить locale:
setLocale('ru');
```

## Docs

- AI-anchor: [`docs/_meta/web-intl.md`](../../../docs/_meta/web-intl.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../docs/_meta/web-zones/runtime.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
