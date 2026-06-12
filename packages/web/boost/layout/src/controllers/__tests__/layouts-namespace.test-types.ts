/**
 * layouts-namespace.test-types.ts — type-level верификация value+namespace merge.
 *
 * Boost-layout получает global namespace `Layouts` (ADR 033) при подключении
 * через `capsule.app.ts: packages: ['@capsuletech/boost-layout']`. Этот файл
 * проверяет что:
 *  1. `const Layouts + namespace Layouts` merge работает в TS.
 *  2. `Layouts.Matrix.Events` резолвится как `IMatrixEvents` в типовой позиции.
 *  3. `Layouts.Matrix` в значенческой позиции — это `MatrixController`.
 *  4. `EventsOf<typeof Layouts.Matrix>` = `IMatrixEvents`.
 *
 * Запускать через tsc (уже включён в typecheck пакета).
 * Нет импорта vitest — чисто type-level файл.
 */

import type { IMatrixEvents, LayoutChangeEvent, MatrixController } from '../matrixController';

// Имитация codegen-объявления: `declare const Layouts` (value namespace, обычно из .capsule/registry).
// В самом пакете codegen отсутствует — тестируем merge на минимальном скретче.
declare const Layouts: { Matrix: typeof MatrixController };

// Открываем namespace Layouts (type-side only).
// Используем declare namespace для merge с value-декларацией Layouts выше.
declare namespace Layouts {
  namespace Matrix {
    type Events = IMatrixEvents;
  }
}

// ----- Верификации -----

// 1. Layouts.Matrix в значенческой позиции — MatrixController (runtime value).
const _matrixVal = Layouts.Matrix;
void _matrixVal;

// 2. Layouts.Matrix.Events в типовой позиции → IMatrixEvents.
type _Events = Layouts.Matrix.Events;
// Structural: Events содержит onLayoutChange: LayoutChangeEvent
type _Check1 = _Events extends { onLayoutChange: LayoutChangeEvent } ? true : false;
const _ok1: _Check1 = true;
void _ok1;

// 3. EventsOf<typeof Layouts.Matrix> = IMatrixEvents (через phantom __events).
type _EventsOf = EventsOf<typeof Layouts.Matrix>;
type _Check2 = _EventsOf extends IMatrixEvents ? true : false;
const _ok2: _Check2 = true;
void _ok2;

// 4. Feature<Layouts.Matrix.Events> — target.payload типизирован как LayoutChangeEvent | undefined.
//    Проверяем через import IDefineStateSchema (замена Feature вызова без реального рантайма).
import type { IDefineStateSchema } from '@capsuletech/web-core';

type _ClosedSchema = IDefineStateSchema<{ saving: boolean }, _Events>;
type _OnLayoutChangeHandler = NonNullable<_ClosedSchema['onLayoutChange']>;
type _Payload = Parameters<_OnLayoutChangeHandler>[0]['target']['payload'];
type _Check3 = _Payload extends LayoutChangeEvent | undefined ? true : false;
const _ok3: _Check3 = true;
void _ok3;
