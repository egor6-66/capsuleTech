export type CtxType = 'no-workspace' | 'workspace-root' | 'app' | 'lib' | 'workspace-inner';
export type CliMode = 'dev' | 'prod';

export interface CliContext {
  type: CtxType;
  name?: string;
  root?: string;
  cwd: string;
  mode: CliMode;
}
