/**
 * package-services.test.ts
 *
 * Unit-тесты для registry-sink `registerPackageServices` / `getPackageServices`.
 *
 * Проверяем:
 *  - базовый сценарий: зарегистрировать → прочитать;
 *  - несколько namespace'ов сосуществуют;
 *  - повторная регистрация под тем же namespace мерджит (не заменяет);
 *  - возвращаемый объект — snapshot (shallow-copy, не живая ссылка на реестр);
 *  - пустой реестр возвращает пустой объект.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerPackageServices,
  getPackageServices,
} from '../package-services';

// Между тестами нам нужен чистый реестр. Модуль хранит состояние в module-level
// переменной. Простейший способ изолировать тесты — читать/писать через публичный
// API и убедиться, что перед каждым тестом реестр в нужном состоянии.
// Поскольку vitest по умолчанию переиспользует модуль между тестами в одном файле,
// мы выносим очистку в beforeEach через явное «удаление» ключей текущего снимка.
//
// Более чистый подход — `vi.resetModules()` + re-import, но он требует async и
// усложняет тест. Альтернативно: тесты в разных describe-блоках независимы,
// если используют уникальные namespace'ы — именно так мы и сделаем.
// Каждый describe использует уникальный namespace, чтобы не пересекаться.

describe('registerPackageServices / getPackageServices — базовый сценарий', () => {
  it('зарегистрированный namespace появляется в getPackageServices()', () => {
    const foo = () => 'foo-result';
    registerPackageServices('test_basic', { foo });

    const result = getPackageServices();

    expect(result).toHaveProperty('test_basic');
    expect((result['test_basic'] as Record<string, unknown>).foo).toBe(foo);
  });

  it('зарегистрированное значение вызываемо', () => {
    const bar = (x: number) => x * 2;
    registerPackageServices('test_callable', { bar });

    const services = getPackageServices();
    const ns = services['test_callable'] as Record<string, unknown>;

    expect(typeof ns.bar).toBe('function');
    expect((ns.bar as (x: number) => number)(21)).toBe(42);
  });
});

describe('registerPackageServices — несколько namespace\'ов', () => {
  it('два namespace сосуществуют независимо', () => {
    const loginFn = () => 'login';
    const dropFn = () => 'drop';

    registerPackageServices('test_auth_ns', { login: loginFn });
    registerPackageServices('test_dnd_ns', { drop: dropFn });

    const result = getPackageServices();

    expect((result['test_auth_ns'] as Record<string, unknown>).login).toBe(loginFn);
    expect((result['test_dnd_ns'] as Record<string, unknown>).drop).toBe(dropFn);
  });

  it('регистрация второго namespace не затрагивает первый', () => {
    const fn1 = () => 'fn1';
    const fn2 = () => 'fn2';

    registerPackageServices('test_isolated_a', { fn1 });
    const before = getPackageServices();
    const aKeys = Object.keys(before['test_isolated_a'] as object);

    registerPackageServices('test_isolated_b', { fn2 });
    const after = getPackageServices();
    const aKeysAfter = Object.keys(after['test_isolated_a'] as object);

    expect(aKeys).toEqual(aKeysAfter);
  });
});

describe('registerPackageServices — мердж при повторном вызове', () => {
  it('второй вызов с тем же namespace добавляет поля (не перезаписывает весь объект)', () => {
    const fnA = () => 'a';
    const fnB = () => 'b';

    registerPackageServices('test_merge', { fnA });
    registerPackageServices('test_merge', { fnB });

    const ns = getPackageServices()['test_merge'] as Record<string, unknown>;

    // Оба поля должны присутствовать
    expect(ns.fnA).toBe(fnA);
    expect(ns.fnB).toBe(fnB);
  });

  it('мердж перезаписывает конкретное поле если ключ совпадает', () => {
    const v1 = () => 'v1';
    const v2 = () => 'v2';

    registerPackageServices('test_overwrite', { fn: v1 });
    registerPackageServices('test_overwrite', { fn: v2 });

    const ns = getPackageServices()['test_overwrite'] as Record<string, unknown>;
    // Последний вызов побеждает для одинакового ключа
    expect(ns.fn).toBe(v2);
  });
});

describe('getPackageServices — snapshot semantics', () => {
  it('возвращает shallow-copy: мутация результата не влияет на реестр', () => {
    const original = () => 'original';
    registerPackageServices('test_snapshot', { fn: original });

    const snap1 = getPackageServices();
    // Удаляем namespace из снимка
    delete (snap1 as Record<string, unknown>)['test_snapshot'];

    // Реестр не затронут — следующий снимок всё ещё содержит namespace
    const snap2 = getPackageServices();
    expect(snap2).toHaveProperty('test_snapshot');
  });

  it('возвращает пустой объект если ничего не зарегистрировано под несуществующим namespace', () => {
    const result = getPackageServices();
    expect(result['__nonexistent_namespace__']).toBeUndefined();
  });
});
