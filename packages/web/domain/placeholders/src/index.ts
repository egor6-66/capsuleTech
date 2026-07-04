// Корневой barrel — блоки-плейсхолдеры + их контракты (props/события) + общий
// презентационный каркас. Регистрация в глобал Placeholders.* — отдельным
// subpath'ом `/capsule` (ADR 033).

export * from './blocks';
export type { IPlaceholderAction, IPlaceholderShellProps } from './shell';
export { PlaceholderShell } from './shell';
