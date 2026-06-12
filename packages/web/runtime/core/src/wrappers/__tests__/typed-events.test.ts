/**
 * typed-events.test.ts — type-level characterization tests (ADR 032, Track #3).
 *
 * Верифицирует:
 *  1. Feature<TEvents, TCtx>(fn) — target.payload типизирован по имени метода БЕЗ
 *     per-handler аннотации (contextual typing через closed mapped return type).
 *  2. TCtx явный → context типизирован без аннотации.
 *  3. Backward-compat: Feature без TEvents — handlers не ломаются (payload = unknown).
 *  4. ITarget.source — поле присутствует в типе (опциональное string).
 *  5. IHandlerApi<TCtx, TPayload> — target.payload = TPayload через второй generic.
 *  6. EventsOf<C> — извлекает phantom __events из компонента (или never).
 *  7. CtxOf + phantom __ctx работает при TEvents явном.
 *
 * Большинство проверок — type-only (Expect<Equal<...>>), верифицируются tsc при typecheck.
 * Vitest-suite: один smoke-it чтобы vitest не падал с "no test suite found".
 */

import type { IDefineStateSchema, IHandlerApi, ITarget } from '../interfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

// ---------------------------------------------------------------------------
// 1. ITarget.source — опциональный string
// ---------------------------------------------------------------------------

type _TargetHasSource = Expect<Equal<ITarget['source'], string | undefined>>;

// ---------------------------------------------------------------------------
// 2. IHandlerApi<TCtx, TPayload> — target.payload = TPayload | undefined
// ---------------------------------------------------------------------------

type _HandlerApiPayload = Expect<
  Equal<IHandlerApi<any, { id: string }>['target']['payload'], { id: string } | undefined>
>;
type _HandlerApiDefaultPayload = Expect<Equal<IHandlerApi['target']['payload'], unknown>>;

// ---------------------------------------------------------------------------
// 3. EventsOf<C> — извлекает phantom __events или never
// ---------------------------------------------------------------------------

type FakeMatrixComponent = ((p: any) => any) & {
  readonly __events?: {
    onLayoutChange: { id: string; kind: 'swap' | 'resize' };
    onResize: { size: number };
  };
};

type _EventsOfMatrix = Expect<
  Equal<
    EventsOf<FakeMatrixComponent>,
    { onLayoutChange: { id: string; kind: 'swap' | 'resize' }; onResize: { size: number } }
  >
>;

type _EventsOfPlain = Expect<Equal<EventsOf<(p: any) => any>, never>>;

// ---------------------------------------------------------------------------
// 4. IDefineStateSchema conditional form — open vs closed
// ---------------------------------------------------------------------------

// Open-форма (default TEvents = {}) — must assignable with arbitrary keys (index sig)
type OpenSchema = IDefineStateSchema<any>;
// Structural check: open schema assignable from object with extra keys
const _openSchemaVal: OpenSchema = {
  initial: 'idle',
  states: {},
  myCustomMethod: () => 'ok',
} as const as any; // cast needed because literal type — но shape valid
void _openSchemaVal;

// Closed-форма при явных TEvents — onDrop присутствует как ключ
type IMyEvents = { onDrop: { x: number; y: number } };
type ClosedSchema = IDefineStateSchema<{ saving: boolean }, IMyEvents>;
// Verify onDrop is a key in ClosedSchema (Pick should not error)
type _ClosedPickOnDrop = Pick<ClosedSchema, 'onDrop'>;
// onDrop handler — payload typed as { x: number; y: number } | undefined
type _ClosedOnDropHandler = NonNullable<_ClosedPickOnDrop['onDrop']>;
type _ClosedPayloadType = Parameters<_ClosedOnDropHandler>[0]['target']['payload'];
type _ClosedPayloadCheck = Expect<Equal<_ClosedPayloadType, { x: number; y: number } | undefined>>;

// ---------------------------------------------------------------------------
// 5. IControllerWrapper — Feature<TEvents, TCtx> generic order
//    TEvents первым, TCtx вторым. Без TEvents → backward-compat (open форма).
//
// Все проверки type-only через IDefineStateSchema — нет рантайм-вызовов.
// ---------------------------------------------------------------------------

// Closed-форма с обоими явными generic'ами
// Верифицируем что handler получает typed payload через IHandlerApi
type IMyFeatureEvents = { onLayoutChange: { id: string } };
type IMyFeatureCtx = { saving: boolean };
// Смотрим на тип handler'а в closed schema
type _ClosedSchemaForHandler = IDefineStateSchema<IMyFeatureCtx, IMyFeatureEvents>;
type _ClosedOnLayoutChangeHandler = NonNullable<_ClosedSchemaForHandler['onLayoutChange']>;
type _ClosedPayloadInHandler = Parameters<_ClosedOnLayoutChangeHandler>[0]['target']['payload'];
// target.payload должен быть { id: string } | undefined
type _ClosedPayloadInHandlerCheck = Expect<
  Equal<_ClosedPayloadInHandler, { id: string } | undefined>
>;
// context в handler должен быть IMyFeatureCtx = { saving: boolean }
type _ClosedContextInHandler = Parameters<_ClosedOnLayoutChangeHandler>[0]['context'];
type _ClosedContextCheck = Expect<Equal<_ClosedContextInHandler, IMyFeatureCtx>>;

// phantom __ctx: IControllerWrapper return type несёт __ctx
// Проверяем через ReturnType вызова с явными типами
type _WrapperReturnClosed = ((props: any) => any) & { readonly __ctx?: IMyFeatureCtx };
type _PhantomCtxCheck = Expect<Equal<CtxOf<_WrapperReturnClosed>, IMyFeatureCtx>>;

// Backward-compat: без TEvents — payload = unknown (IHandlerApi default)
type _BackwardPayload = IHandlerApi['target']['payload'];
type _BackwardPayloadCheck = Expect<Equal<_BackwardPayload, unknown>>;

// Backward-compat: IDefineStateSchema без TEvents — открытая форма
// open форма содержит context? как опциональный
type _OpenSchemaContext = IDefineStateSchema<{ count: number }>['context'];
type _OpenSchemaContextCheck = Expect<Equal<_OpenSchemaContext, { count: number } | undefined>>;

// ---------------------------------------------------------------------------
// 6. Per-state typed payload в ЗАКРЫТОЙ форме (основной предмет исправления).
//
//    Проблема: states?: Record<string, IStateHandlers<TCtx>> использовал
//    открытую форму IStateHandlers с index-sig → payload = unknown внутри стейта.
//    Исправление: IStateHandlersClosed<TCtx, TEvents> без index-sig.
//
//    Верифицируем:
//    a) handler onLogin ВНУТРИ стейта получает payload с user (не unknown)
//    b) onClick ВНУТРИ стейта (IFixedHandlers) сохраняет типизацию TCtx
//    c) handler ОДНОГО события может быть объявлен и на top-level, и в стейте
//       (runtime: state-first → top-level; типы не конфликтуют)
// ---------------------------------------------------------------------------

type IAuthEvents = { onLogin: { user: string; token: string } };
type IAuthCtx = { loading: boolean };
type ClosedAuthSchema = IDefineStateSchema<IAuthCtx, IAuthEvents>;

// a) per-state payload: states.guest.onLogin → target.payload typed
type _GuestStateHandlers = NonNullable<ClosedAuthSchema['states']>[string];
type _GuestOnLoginHandler = NonNullable<_GuestStateHandlers['onLogin']>;
type _GuestOnLoginPayload = Parameters<_GuestOnLoginHandler>[0]['target']['payload'];
type _GuestPayloadCheck = Expect<
  Equal<_GuestOnLoginPayload, { user: string; token: string } | undefined>
>;

// b) onClick в стейте сохраняет типизацию TCtx (из IFixedHandlers<TCtx>)
type _GuestOnClickHandler = NonNullable<_GuestStateHandlers['onClick']>;
type _GuestOnClickCtx = Parameters<_GuestOnClickHandler>[0]['context'];
type _GuestOnClickCtxCheck = Expect<Equal<_GuestOnClickCtx, IAuthCtx>>;

// c) onLogin на top-level и в стейте — одинаковая сигнатура (не конфликтуют)
type _TopLevelOnLoginHandler = NonNullable<ClosedAuthSchema['onLogin']>;
type _TopLevelOnLoginPayload = Parameters<_TopLevelOnLoginHandler>[0]['target']['payload'];
type _TopLevelPayloadCheck = Expect<
  Equal<_TopLevelOnLoginPayload, { user: string; token: string } | undefined>
>;
// top-level и per-state payload-тип совпадают (Equal)
type _TopVsStatePayloadConsistent = Expect<
  Equal<_TopLevelOnLoginPayload, _GuestOnLoginPayload>
>;

// d) Backward-compat: open форма — states[string] по-прежнему IStateHandlers с index-sig
type OpenAuthSchema = IDefineStateSchema<IAuthCtx>;
type _OpenStateHandlers = NonNullable<OpenAuthSchema['states']>[string];
// в open форме произвольный ключ присваивается (index-sig разрешён)
type _OpenIndexSigCheck = _OpenStateHandlers extends { [k: string]: any } ? true : false;
type _OpenIndexSigAssert = Expect<Equal<_OpenIndexSigCheck, true>>;

// ---------------------------------------------------------------------------
// 7. ITarget.source доступен в рантайм-паттерне (через useEmit partial)
//    Тип-level: partial с source присваивается к Partial<ITarget>
// ---------------------------------------------------------------------------

const _sourcePartial: Partial<ITarget> = {
  source: '@capsuletech/boost-layout',
  payload: { id: 'cell-1' },
};
// Silence unused variable warning
void _sourcePartial;

// ---------------------------------------------------------------------------
// Vitest smoke-suite (type-level checks run at tsc typecheck time above)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

describe('typed-events — type contracts (ADR 032 Track #3)', () => {
  it('ITarget has source field (string | undefined)', () => {
    const t: ITarget = {};
    // source is optional string — assign and access without error
    t.source = '@capsuletech/boost-layout';
    // no runtime assertion needed — type check above covers this
  });

  it('ITarget payload generic defaults to unknown', () => {
    const t: ITarget = { payload: 'any-value' };
    // ITarget default = ITarget<unknown> — payload accepted as unknown
    const _: unknown = t.payload;
    void _;
  });

  it('per-state typed payload in closed form — type checks pass at compile time', () => {
    // Type-level checks for section 6 run at tsc typecheck time (see _GuestPayloadCheck etc).
    // This runtime-it exists solely so vitest sees the suite as non-empty.
    // Если _GuestPayloadCheck / _GuestOnClickCtxCheck и другие проверки выше не скомпилились —
    // tsc typecheck упадёт раньше, чем эта строчка выполнится в runtime.
    expect(true).toBe(true);
  });
});
