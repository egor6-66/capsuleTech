export type ComponentStatus = 'idle' | 'success' | 'error' | 'warning';

export const STATUS_VARIABLES: Record<ComponentStatus, Record<string, string>> = {
  idle: { '--current-status': 'transparent' },
  success: { '--current-status': 'var(--status-success)' },
  error: { '--current-status': 'var(--status-error)' },
  warning: { '--current-status': 'var(--status-warning)' },
};
