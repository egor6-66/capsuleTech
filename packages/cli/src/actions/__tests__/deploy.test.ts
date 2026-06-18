import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseDotEnv, resolveDeployVar } from '../deploy';

describe('parseDotEnv', () => {
  it('reads KEY=VALUE pairs', () => {
    const out = parseDotEnv('DEPLOY_SERVER=http://localhost:8090\nDEPLOY_TOKEN=abc');
    expect(out).toEqual({ DEPLOY_SERVER: 'http://localhost:8090', DEPLOY_TOKEN: 'abc' });
  });

  it('ignores comments and blank lines', () => {
    const out = parseDotEnv('# header\n\nDEPLOY_PORT=8090\n# tail\n');
    expect(out).toEqual({ DEPLOY_PORT: '8090' });
  });

  it('splits on first `=` only', () => {
    expect(parseDotEnv('PUBLIC_HOST=host:8090=extra')).toEqual({
      PUBLIC_HOST: 'host:8090=extra',
    });
  });

  it('strips matching surrounding quotes', () => {
    expect(parseDotEnv('A="with spaces"\nB=\'single\'')).toEqual({
      A: 'with spaces',
      B: 'single',
    });
  });

  it('trims surrounding whitespace on key + value', () => {
    expect(parseDotEnv('  DEPLOY_TOKEN  =  demo123  ')).toEqual({ DEPLOY_TOKEN: 'demo123' });
  });

  it('skips malformed lines without `=`', () => {
    expect(parseDotEnv('garbage\nOK=1')).toEqual({ OK: '1' });
  });
});

describe('resolveDeployVar', () => {
  const ORIGINAL_ENV = process.env;
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DEPLOY_SERVER;
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('prefers param flag over env and .env', () => {
    process.env.DEPLOY_SERVER = 'http://from-env';
    const v = resolveDeployVar('http://from-flag', 'DEPLOY_SERVER', {
      DEPLOY_SERVER: 'http://from-dotenv',
    });
    expect(v).toBe('http://from-flag');
  });

  it('falls back to process.env when flag missing', () => {
    process.env.DEPLOY_SERVER = 'http://from-env';
    const v = resolveDeployVar(undefined, 'DEPLOY_SERVER', {
      DEPLOY_SERVER: 'http://from-dotenv',
    });
    expect(v).toBe('http://from-env');
  });

  it('falls back to .env when flag and env missing', () => {
    const v = resolveDeployVar(undefined, 'DEPLOY_SERVER', {
      DEPLOY_SERVER: 'http://from-dotenv',
    });
    expect(v).toBe('http://from-dotenv');
  });

  it('returns undefined when nothing is set', () => {
    expect(resolveDeployVar(undefined, 'DEPLOY_SERVER', {})).toBeUndefined();
  });

  it('treats empty strings as missing (so next source wins)', () => {
    process.env.DEPLOY_SERVER = '';
    const v = resolveDeployVar('', 'DEPLOY_SERVER', { DEPLOY_SERVER: 'http://from-dotenv' });
    expect(v).toBe('http://from-dotenv');
  });
});
