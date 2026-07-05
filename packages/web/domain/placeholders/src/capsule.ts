/**
 * @capsuletech/web-placeholders/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-placeholders']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Placeholders.*:
 *   Placeholders.NotFound | Placeholders.Error | Placeholders.AccessDenied |
 *   Placeholders.Community | Placeholders.WidgetUnavailable | Placeholders.Empty
 *
 * Имя 'Placeholders' — не JS-builtin (нет конфликта TS2451).
 *
 * `Error`-ключ маппится на экспорт `ErrorState` — сам компонент назван так, чтобы
 * не шадоуить JS-builtin `Error` в модуле; в глобал-namespace он попадает под
 * каноничным именем `Placeholders.Error`.
 *
 * Каждый блок несёт phantom `__events` — codegen строит `Placeholders.<X>.Events`
 * для типизации доменной Feature аппа (`onHome`/`onRetry`/`onLogin`/`onJoin`).
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { AccessDenied, Community, Empty, ErrorState, NotFound, WidgetUnavailable } from './blocks';

export default defineCapsuleModule({
  name: 'Placeholders',
  components: {
    NotFound,
    Error: ErrorState,
    AccessDenied,
    Community,
    WidgetUnavailable,
    Empty,
  },
});
