/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { groupManifests } from '../groups';
import { Palette } from '../Palette';
import { getAllManifests } from '@capsuletech/web-ui/manifest';

describe('Palette — iteration 1 smoke', () => {
  it('groupManifests разделяет на primitives и compositions', () => {
    const groups = groupManifests(getAllManifests());
    expect(groups.primitives.length).toBeGreaterThan(0);
    expect(groups.compositions.length).toBeGreaterThan(0);
    // composite-парты НЕ попадают ни в одну группу (скрыты в итерации 1)
    expect(
      [...groups.primitives, ...groups.compositions].every(
        (m) => m.category !== 'composite',
      ),
    ).toBe(true);
  });

  it('рендерится без ошибок и показывает L1 заголовки', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Palette />, host);
    try {
      expect(host.textContent).toContain('Примитивы');
      expect(host.textContent).toContain('Композиции');
    } finally {
      dispose();
    }
  });

  it('содержит хотя бы один известный компонент (Button)', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Palette />, host);
    try {
      expect(host.textContent).toContain('Button');
    } finally {
      dispose();
    }
  });

  it('не содержит L3 «Дефолт»/«Кастом» (плоская L2)', () => {
    const host = document.createElement('div');
    const dispose = render(() => <Palette />, host);
    try {
      expect(host.textContent).not.toContain('Дефолт');
      expect(host.textContent).not.toContain('Кастом');
    } finally {
      dispose();
    }
  });
});
