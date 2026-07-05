// Корневой barrel — реэкспортит framework-agnostic core (контракты + типы).
// Connected-блоки (LessonView / Exercise / Welcome / Provider / ...) подключаются
// как глобалы `Learn.*` через `@capsuletech/web-learn/capsule` (ADR 033),
// а не импортятся напрямую.
export * from './core';
