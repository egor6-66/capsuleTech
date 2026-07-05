/**
 * web-learn skeleton smoke — рендерим pure-display плейсхолдеры через solid-js/web
 * (зеркало studio-паттерна: manual host + dispose, без @solidjs/testing-library —
 * её в репо нет, эталон тестирует так же).
 *
 * Welcome НЕ тестим bare: его `useEmit` требует Controller-контекст (как и
 * studio Welcome — он тоже не покрыт unit-тестом).
 */
import { render } from 'solid-js/web';
import { describe, expect, test } from 'vitest';
import { Exercise } from '../exercise';
import { Tour } from '../guides';
import { Collections, VocabList } from '../library';
import { Progress } from '../progress';
import { SentenceBuilder } from '../sentence-builder';

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

  test('VocabList renders', () => {
    const host = document.createElement('div');
    const dispose = render(() => <VocabList />, host);
    try {
      expect(host.querySelector('[data-stub="Learn.VocabList"]')).toBeTruthy();
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
