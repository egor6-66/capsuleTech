/**
 * web-learn skeleton smoke — рендерим pure-display плейсхолдеры через solid-js/web
 * (зеркало studio-паттерна: manual host + dispose, без @solidjs/testing-library —
 * её в репо нет, эталон тестирует так же).
 *
 * Nav/Welcome здесь не покрываются: после дедупа (brief `pilot-segment-nav-4-learn`)
 * это композиция `Shell.SegmentNav`/`Shell.Launcher` в `capsule.tsx` — тестируются
 * сами shell-блоки в web-shell, не тонкий data-биндинг зоны.
 */
import { render } from 'solid-js/web';
import { describe, expect, test } from 'vitest';
import { Exercise } from '../modules/exercise';
import { Tour } from '../modules/guides';
import { Collections } from '../modules/library';
import { Progress } from '../modules/progress';
import { SentenceBuilder } from '../modules/sentence-builder';

describe('web-learn skeleton smoke', () => {
  test('Exercise dispatches by type', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Exercise type="fill-blank" />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.Exercise"]')).toBeTruthy();
      expect(host.querySelector('[data-stub="Learn.Exercise.FillBlank"]')).toBeTruthy();
    } finally {
      dispose();
    }
  });

  test('Progress renders', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Progress />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.Progress"]')).toBeTruthy();
    } finally {
      dispose();
    }
  });

  test('Tour renders', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Tour />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.Tour"]')).toBeTruthy();
    } finally {
      dispose();
    }
  });

  test('SentenceBuilder renders', () => {
    const host = document.createElement('div');
    const dispose = render(() => <SentenceBuilder />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.SentenceBuilder"]')).toBeTruthy();
    } finally {
      dispose();
    }
  });

  test('Collections renders', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Collections />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.Collections"]')).toBeTruthy();
    } finally {
      dispose();
    }
  });
});
