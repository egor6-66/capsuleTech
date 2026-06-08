/**
 * package-services.ts
 *
 * Registry sink: доменные пакеты (web-auth, web-dnd, …) регистрируют свои
 * actions/services под namespace через `registerPackageServices`.
 * `createLogicWrapper` спредит результат `getPackageServices()` в объект
 * `services`, передаваемый factory-телу Controller/Feature.
 *
 * Паттерн аналогичен `CapsuleApi` (interface merging через module augmentation):
 *   - web-auth добавляет `interface CapsuleServices { auth: IAuthServices }`
 *   - вызывает `registerPackageServices('auth', authActions)` в своём bootstrap'е
 *   - factory-тело Feature получает `services.auth` с полной типизацией
 *
 * Ключевые гарантии:
 *  - базовые поля IServices (router / api / zod / utils / emit) НЕ перезаписываются
 *    (namespace'ы пакетов не пересекаются с ними по контракту);
 *  - повторный вызов `registerPackageServices` мерджит (не перезаписывает) вложенные
 *    объекты под одним namespace'ом — например если пакет вызывает регистрацию
 *    из нескольких точек входа.
 *
 * web-core НЕ содержит ни одной регистрации: это сделают сами пакеты
 * (web-auth, web-dnd и т.д.) при инициализации.
 */

/** Внутренний реестр: namespace → services-object. */
const _registry: Record<string, Record<string, unknown>> = {};

/**
 * Регистрирует (или мерджит в существующий) пакетный services-объект под `namespace`.
 *
 * Пример из `@capsuletech/web-auth`:
 * ```ts
 * import { registerPackageServices } from '@capsuletech/web-core';
 *
 * registerPackageServices('auth', {
 *   login: authService.login,
 *   logout: authService.logout,
 * });
 * ```
 *
 * После этого в factory-теле Feature/Controller доступно:
 * ```ts
 * Feature((services) => ({
 *   states: {
 *     idle: {
 *       async onSubmit({ target }) {
 *         await services.auth.login(target.value);  // типизировано через CapsuleServices
 *       },
 *     },
 *   },
 * }));
 * ```
 *
 * @param namespace  Уникальный ключ пакета (рекомендуется: имя домена без @capsuletech/,
 *                   например `'auth'`, `'dnd'`).
 * @param services   Объект с actions / helpers пакета.
 */
export const registerPackageServices = (
  namespace: string,
  services: Record<string, unknown>,
): void => {
  if (_registry[namespace]) {
    // Мерджим: пакет может вызывать регистрацию из нескольких точек входа.
    Object.assign(_registry[namespace], services);
  } else {
    _registry[namespace] = { ...services };
  }
};

/**
 * Возвращает плоский снимок реестра `{ [namespace]: services }` для спреда
 * в объект `services` внутри `createLogicWrapper`.
 *
 * Возвращаемый объект — копия (не живая ссылка): он строится при каждом монтировании
 * LogicWrapper. Изменения в реестре после монтирования НЕ применяются к уже
 * работающим Controller/Feature — это задокументированный трейд-офф (регистрацию
 * следует делать до mount'а, т.е. при инициализации пакета).
 */
export const getPackageServices = (): Record<string, unknown> => {
  // Возвращаем shallow-copy чтобы спред в services не мутировал внутренний реестр.
  return { ..._registry };
};
