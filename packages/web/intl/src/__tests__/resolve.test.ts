import { beforeEach, describe, expect, it } from 'vitest';
import { setDefaultLocale, setLocale, setTenant } from '../locale';
import { __resetRegistry, registerCopy, registerTenantCopy } from '../registry';
import { resolveCopy } from '../resolve';

beforeEach(() => {
  __resetRegistry();
  setLocale('');
  setTenant(null);
  setDefaultLocale('');
});

describe('resolveCopy — fallback chain', () => {
  it('returns the key itself when nothing is registered', () => {
    expect(resolveCopy('login.title')).toBe('login.title');
  });

  it('returns the caller fallback before the key', () => {
    expect(resolveCopy('login.title', 'Sign in')).toBe('Sign in');
  });

  it('resolves from the active locale', () => {
    registerCopy('en', { 'login.title': 'Sign in' });
    setLocale('en');
    expect(resolveCopy('login.title')).toBe('Sign in');
  });

  it('falls back to the default locale when the active one lacks the key', () => {
    registerCopy('en', { 'login.title': 'Sign in' });
    registerCopy('ru', { 'login.subtitle': 'Подзаголовок' });
    setLocale('ru');
    setDefaultLocale('en');
    expect(resolveCopy('login.title')).toBe('Sign in');
  });

  it('prefers active-locale copy over the default locale', () => {
    registerCopy('en', { 'login.title': 'Sign in' });
    registerCopy('ru', { 'login.title': 'Вход' });
    setLocale('ru');
    setDefaultLocale('en');
    expect(resolveCopy('login.title')).toBe('Вход');
  });
});

describe('resolveCopy — tenant overrides', () => {
  beforeEach(() => {
    registerCopy('en', { 'login.title': 'Sign in', 'login.cta': 'Continue' });
    registerTenantCopy('acme', 'en', { 'login.title': 'Welcome to ACME' });
    setLocale('en');
  });

  it('uses the base copy when no tenant is active', () => {
    expect(resolveCopy('login.title')).toBe('Sign in');
  });

  it('overrides only the tenant-specified keys', () => {
    setTenant('acme');
    expect(resolveCopy('login.title')).toBe('Welcome to ACME');
    expect(resolveCopy('login.cta')).toBe('Continue');
  });

  it('clears the override when tenant is set back to null', () => {
    setTenant('acme');
    setTenant(null);
    expect(resolveCopy('login.title')).toBe('Sign in');
  });
});

describe('resolveCopy — switching', () => {
  it('swaps all text when the active locale changes', () => {
    registerCopy('en', { greeting: 'Hello' });
    registerCopy('ru', { greeting: 'Привет' });

    setLocale('en');
    expect(resolveCopy('greeting')).toBe('Hello');

    setLocale('ru');
    expect(resolveCopy('greeting')).toBe('Привет');
  });

  it('picks up dictionaries registered after the first resolve', () => {
    setLocale('en');
    expect(resolveCopy('greeting')).toBe('greeting');

    registerCopy('en', { greeting: 'Hello' });
    expect(resolveCopy('greeting')).toBe('Hello');
  });
});
