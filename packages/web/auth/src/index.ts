// Корневой barrel — общие контракты + session. Стратегии (/role, /credentials,
// /oauth2, /qr) и UI/controllers тянутся ОТДЕЛЬНЫМИ subpath'ами для tree-shaking:
//   import { roleStrategy } from '@capsuletech/web-auth/role';
//   import { useAuth }      from '@capsuletech/web-auth/session';
// /ui и /controllers намеренно НЕ в barrel (UI/web-core-зависимые блоки).

export * from './types';
export * from './session';
