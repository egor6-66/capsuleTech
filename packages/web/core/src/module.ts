/**
 * @capsuletech/web-core/module
 *
 * Контракт пакета-участника механизма регистрации (ADR 033).
 *
 * Пакет, желающий регистрироваться как глобал в capsule.app.ts,
 * создаёт subpath `/capsule` и экспортирует оттуда дефолтом результат
 * `defineCapsuleModule(...)`.
 *
 * Этот файл намеренно не содержит рантайм-зависимостей (только identity +
 * типы), чтобы subpath `/capsule` пакетов (web-map и т.д.) тянул минимум.
 *
 * @example
 * // @capsuletech/boost-map/capsule
 * import { defineCapsuleModule } from '@capsuletech/web-core/module';
 * import { MapView, Source, Layer, Marker } from '../index';
 *
 * export default defineCapsuleModule({
 *   name: 'Maps',
 *   components: { View: MapView, Source, Layer, Marker },
 * });
 */

import type { Component } from 'solid-js';

/**
 * Компонент-подобное значение.
 *
 * Используем `Component<any>` из solid-js как верхнюю границу — это покрывает
 * как простые `(props: P) => JSX.Element`, так и compound-компоненты с
 * прикреплёнными статическими свойствами (Object.assign-паттерн).
 *
 * `Record<string, any>` добавлен через union потому что часть компонентов
 * (Terrain, Sky, BuildingsPreset и т.д.) декларирует props как plain object
 * без явного `JSXElement` в возврате при использовании maplibre context-паттерна.
 * Строгий `Component<P>` ломал бы inference для таких компонентов —
 * поэтому тип намеренно широкий: оба варианта приемлемы.
 */
type AnyComponent = Component<any> | ((...args: any[]) => any);

/**
 * Курируемый манифест пакета — shape, который ожидает `defineCapsuleModule`.
 *
 * Поля:
 *
 * `name` — defaultName глобала. НЕ должен совпадать с JS-built-in именем
 * (Map/Set/Date/Promise/…), иначе TS выдаст TS2451 «Cannot redeclare
 * block-scoped variable» при генерации `declare const <Name>` в packages.d.ts.
 * Пример правильного имени: `'Maps'` (а не `'Map'`).
 *
 * `components` — курируемая поверхность компонентов пакета, которая попадёт
 * в глобал `<Name>.*`. Имена ключей решает автор манифеста.
 * Пример: `{ View: MapView, Source, Layer, Marker }` → `Maps.View`, `Maps.Layer`.
 *
 * `controllers` — опционально. HCA-контроллеры пакета (ADR 032 фаза 4).
 * Одна декларация = обе половины: визуал (`Maps.*`) + логика (`Controllers.Maps`).
 * На момент ADR 033 фаза 1 не используется; reserved для interlock-кодгена.
 */
export interface ICapsuleModule {
  /**
   * defaultName глобала.
   *
   * НЕ должен быть именем JS-builtin (Map/Set/Date/Promise/…):
   * `declare const Map` в packages.d.ts → TS2451.
   * Используй `Maps`, `Charts`, `Renderer` и т.д.
   */
  name: string;
  /**
   * Курируемая поверхность компонентов пакета.
   * Ключи становятся именами в глобал-namespace: `components.View` → `Maps.View`.
   */
  components: Record<string, AnyComponent | any>;
  /**
   * Опционально: HCA-контроллеры пакета (ADR 032 фаза 4).
   * Будет использован кодгеном `CapsuleRegistryPlugin` для интерлока
   * с `Controllers.X` namespace. Сейчас зарезервировано.
   */
  controllers?: Record<string, any>;
}

/**
 * Identity-функция — аналог `defineAppConfig` для пакетных манифестов.
 *
 * Сохраняет литеральный type-inference (TypeScript не «стирает» literal types
 * через `satisfies` без explicit type annotation, но identity-функция с
 * generic constraint `<T extends ICapsuleModule>` сохраняет точный тип `T`).
 *
 * Runtime: возвращает переданный объект без изменений.
 *
 * @example
 * export default defineCapsuleModule({
 *   name: 'Maps',
 *   components: { View: MapView, Source, Layer },
 * });
 */
export const defineCapsuleModule = <T extends ICapsuleModule>(module: T): T => module;
