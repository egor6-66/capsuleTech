/**
 * @capsuletech/web-learn/core — доменные контракты обучающего flow.
 *
 * UI-блоки пакета generic относительно модуля learn-бэка: <LessonView>
 * показывает любой concept, <Exercise> рендерит любой тип. Контент и логика
 * приходят с backend/learn (ADR 055) — здесь только формы данных.
 *
 * SKELETON: контракты-плейсхолдеры, уточнятся при backend-интеграции.
 */
export type ExerciseType = 'fill-blank' | 'build-clause' | 'fix-type-error' | 'translate';

export interface IConcept {
  id: string;
  title: string;
  /** TS-аналогия из брифа grammar-as-types (напр. "new vs reference"). */
  tsAnalogy?: string;
  prerequisites: string[];
  body?: string;
  exercises: ExerciseType[];
}

export interface IExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  answer?: string;
}

export interface IProgressEntry {
  conceptId: string;
  /** Leitner box (1..N). */
  box: number;
  lastReviewed?: string;
}

export interface ISkillNode {
  conceptId: string;
  title: string;
  unlocked: boolean;
  children: ISkillNode[];
}
