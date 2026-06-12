/**
 * /role — тесты roleStrategy + форм-конфига + zod-схем.
 */

import { describe, expect, it } from 'vitest';
import {
  type IRoleStrategyConfig,
  loginRequestSchema,
  loginResponseSchema,
  roleStrategy,
} from '../index';

const defaultConfig: IRoleStrategyConfig = {
  roles: [
    { value: 'developer', label: 'Developer' },
    { value: 'support', label: 'Support' },
  ],
};

describe('roleStrategy()', () => {
  it('возвращает id = "role"', () => {
    const s = roleStrategy(defaultConfig);
    expect(s.id).toBe('role');
  });

  it('fields содержит 2 поля: select + password', () => {
    const s = roleStrategy(defaultConfig);
    expect(s.fields).toHaveLength(2);
    expect(s.fields[0].type).toBe('select');
    expect(s.fields[0].tag).toBe('role');
    expect(s.fields[1].type).toBe('password');
    expect(s.fields[1].tag).toBe('password');
  });

  it('select.options = переданные roles (НЕ хардкод)', () => {
    const customRoles = [
      { value: 'admin', label: 'Admin' },
      { value: 'viewer', label: 'Viewer' },
    ];
    const s = roleStrategy({ roles: customRoles });
    expect(s.fields[0].options).toEqual(customRoles);
  });

  it('defaults.role = первая роль из конфига', () => {
    const s = roleStrategy(defaultConfig);
    expect(s.defaults?.role).toBe('developer');
  });

  it('defaults.password = ""', () => {
    const s = roleStrategy(defaultConfig);
    expect(s.defaults?.password).toBe('');
  });

  it('кастомные label для полей через roleLabel/passwordLabel', () => {
    const s = roleStrategy({
      ...defaultConfig,
      roleLabel: 'Ваша роль',
      passwordLabel: 'Секретный код',
    });
    expect(s.fields[0].label).toBe('Ваша роль');
    expect(s.fields[1].label).toBe('Секретный код');
  });

  it('дефолтные label при отсутствии roleLabel/passwordLabel', () => {
    const s = roleStrategy(defaultConfig);
    expect(s.fields[0].label).toBe('Роль');
    expect(s.fields[1].label).toBe('Пароль');
  });

  it('пустой массив ролей — не падает, defaults.role = ""', () => {
    const s = roleStrategy({ roles: [] });
    expect(s.defaults?.role).toBe('');
    expect(s.fields[0].options).toEqual([]);
  });
});

describe('loginRequestSchema (zod)', () => {
  it('валидный input проходит парсинг', () => {
    const result = loginRequestSchema.safeParse({ role: 'developer', password: '123' });
    expect(result.success).toBe(true);
  });

  it('role обязательна и не должна быть пустой', () => {
    const empty = loginRequestSchema.safeParse({ role: '', password: '123' });
    expect(empty.success).toBe(false);
  });

  it('password может быть пустой строкой', () => {
    const result = loginRequestSchema.safeParse({ role: 'support', password: '' });
    expect(result.success).toBe(true);
  });

  it('отсутствие role — ошибка валидации', () => {
    const result = loginRequestSchema.safeParse({ password: '123' });
    expect(result.success).toBe(false);
  });
});

describe('loginResponseSchema (zod)', () => {
  it('минимальный ответ (token + role) проходит', () => {
    const result = loginResponseSchema.safeParse({
      token: 'jwt-abc',
      role: 'developer',
    });
    expect(result.success).toBe(true);
  });

  it('опциональный user-объект принимается', () => {
    const result = loginResponseSchema.safeParse({
      token: 'jwt-abc',
      role: 'developer',
      user: { id: '42', role: 'developer', name: 'Alice' },
    });
    expect(result.success).toBe(true);
  });

  it('отсутствие token — ошибка', () => {
    const result = loginResponseSchema.safeParse({ role: 'developer' });
    expect(result.success).toBe(false);
  });
});
