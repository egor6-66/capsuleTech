import { type CapsuleZ, z } from '@capsuletech/shared-zod';
import type { ZodType } from 'zod';
import type { Middleware } from './pipeline';
import type { HttpMethod } from './types';

/** Извлекает Output-тип из ZodType (то, что отдаёт `safeParse(...).data`). */
type ZOut<T> = T extends ZodType<infer O, any, any> ? O : unknown;

/**
 * Контекст, передаваемый в `preRequest`-хэндлер. Запускается **между**
 * `validateInput` (zod-parse уже произошёл) и `buildRequest` (URL/body ещё не
 * собраны). Хэндлер либо мутирует `input` через `setInput()`, либо
 * короткозамыкает pipeline через `resolve(data)` / `reject(err)`.
 *
 * `resolve(data)` пропускает `buildRequest` / `httpTransport` /
 * `validateResponse` / `mapDomain` — `data` уходит к caller'у as-is (caller
 * передаёт **final domain shape**, не raw DTO).
 */
export interface PreRequestCtx<I, D> {
  /** Валидированный input (`zod.parse` уже отработал в `validateInput`-mw). */
  readonly input: I;
  /**
   * Заменить input — downstream pipeline увидит новое значение.
   * **НЕ перевалидируется** через `endpoint.request`-схему (caller'а
   * ответственность поддерживать тип).
   */
  setInput: (next: I) => void;
  /**
   * Short-circuit: завершить pipeline с `data` как финальным domain-значением
   * (после-map shape). Пропускает `buildRequest` / `httpTransport` /
   * `validateResponse` / `mapDomain` целиком.
   */
  resolve: (data: D) => void;
  /** Short-circuit с ошибкой — caller увидит её как `throw`-rejection. */
  reject: (err: unknown) => void;
  /** Метаданные endpoint'а для endpoint-aware логики. */
  readonly endpoint: { readonly path: string; readonly method: HttpMethod };
}

/**
 * Per-endpoint hook для четырёх use case'ов:
 *
 * 1. **Mock** — `resolve(data)` без похода в сеть.
 * 2. **Transform input** — `setInput(transformed)` до `buildRequest`.
 * 3. **Conditional mock** — `if (!token) resolve([])`.
 * 4. **Business-rule abort** — `if (amount > N) reject(new Error(...))`.
 *
 * Это типизированный сахар поверх middleware pipeline: всю pipeline
 * можно собрать руками через `endpoint.middleware`, но `preRequest`
 * — declarative и удаляется одной строкой когда появляется реальный backend.
 */
export type PreRequest<I = unknown, D = unknown> = (
  ctx: PreRequestCtx<I, D>,
) => void | Promise<void>;

/**
 * Описание одного endpoint'а — generic над zod-схемами (а не по их парсенным
 * типам). Это нужно чтобы TS успешно прокинул `R = ZOut<response>` в параметр
 * `map: (dto) => D`: иначе при двухуровневом обобщении (`request: ZodType<I>`)
 * вывод теряется и `dto` становится `unknown`.
 */
export interface EndpointConfig<
  TReq extends ZodType = ZodType,
  TRes extends ZodType = ZodType,
  D = ZOut<TRes>,
> {
  method: HttpMethod;
  path: string;
  /** Имя из `bases` в IAppConfig.api — определяет baseURL. `'default'` если не задано. */
  base?: string;
  /** Zod-схема входа. Невалидный input — `ValidationError('request')`. */
  request?: TReq;
  /** Zod-схема ответа. Невалидный response — `ValidationError('response')`. */
  response?: TRes;
  /** dto (валидированный response) → domain. Если не задан — domain === dto. */
  map?: (dto: ZOut<TRes>) => D;
  /** Опционально staleTime для cached запросов (только GET). */
  staleTime?: number;
  /** Per-endpoint middleware — применяется в самом конце pipeline (после mapDomain). */
  middleware?: ReadonlyArray<Middleware>;
  /**
   * Per-endpoint pre-request hook — typed-сахар над middleware. Запускается
   * между `validateInput` и `buildRequest`. См. {@link PreRequest}.
   *
   * Use cases:
   *  - Mock: `({ resolve }) => resolve({ id: 1, name: 'mocked' })`
   *  - Transform input: `({ input, setInput }) => setInput({ ...input, normalized: true })`
   *  - Conditional mock: `({ resolve }) => { if (!token) resolve([]); }`
   *  - Business-rule abort: `({ input, reject }) => { if (input.amount > 1000) reject(new Error('too big')); }`
   *
   * Для деактивации в prod-сборке оберни в `devOnly(...)` —
   * Vite/Rollup tree-shake вырежет код целиком.
   */
  preRequest?: PreRequest<ZOut<TReq>, D>;
}

declare const __input: unique symbol;
declare const __output: unique symbol;

/**
 * Phantom-типы — носят `I` и `D` через границы вызовов, чтобы `createApi`
 * мог их вывести в финальный тип `(input: I) => Promise<D>`.
 */
export interface Endpoint<I = unknown, D = unknown> {
  readonly config: EndpointConfig;
  readonly [__input]?: I;
  readonly [__output]?: D;
}

export type InferInput<E> = E extends Endpoint<infer I, any> ? I : never;
export type InferOutput<E> = E extends Endpoint<any, infer D> ? D : never;

/**
 * Фабрика endpoint'а. Получает `z` (CapsuleZ из `@capsuletech/shared-zod`),
 * возвращает конфиг. Дизайн повторяет `Shape((z, ui) => ...)`:
 * пользователь не импортирует zod руками.
 *
 * ```ts
 * export const get = defineEndpoint((z) => ({
 *   method: 'GET',
 *   path: '/users/:id',
 *   request: z.object({ id: z.string() }),
 *   response: z.object({ id: z.string(), email: z.string() }),
 * }));
 * ```
 */
export const defineEndpoint = <TReq extends ZodType, TRes extends ZodType, D = ZOut<TRes>>(
  factory: (z: CapsuleZ) => EndpointConfig<TReq, TRes, D>,
): Endpoint<ZOut<TReq>, D> => {
  const config = factory(z);
  return { config: config as EndpointConfig } as Endpoint<ZOut<TReq>, D>;
};
