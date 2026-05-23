import { describe, expect, it } from 'vitest';
import { canAcceptChild } from '../../manifests/registry';
import { generate } from '../engine';
import { FORM_PRESET } from '../presets/form';
import {
  BUTTON_PRIMARY_TEXTS,
  BUTTON_SECONDARY_TEXTS,
  CARD_TITLES,
  FIELD_LABELS,
} from '../wordbank';

describe('FORM_PRESET', () => {
  it('root is always ui.Card', () => {
    for (let seed = 0; seed < 30; seed++) {
      const tree = generate(FORM_PRESET, { seed });
      expect(tree.nodes[tree.root]?.type).toBe('ui.Card');
    }
  });

  it('Card.Content is always present', () => {
    for (let seed = 0; seed < 30; seed++) {
      const tree = generate(FORM_PRESET, { seed });
      const hasContent = Object.values(tree.nodes).some((n) => n.type === 'ui.Card.Content');
      expect(hasContent).toBe(true);
    }
  });

  it('Field children = Label + Content (+ optional Description)', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const fields = Object.values(tree.nodes).filter((n) => n.type === 'ui.Field');
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      const childTypes = field.children.map((id) => tree.nodes[id]?.type);
      expect(childTypes).toContain('ui.Field.Label');
      expect(childTypes).toContain('ui.Field.Content');
      // Description optional — может или быть, или нет
      for (const t of childTypes) {
        expect(['ui.Field.Label', 'ui.Field.Content', 'ui.Field.Description']).toContain(t);
      }
    }
  });

  it('Field.Content holds exactly one Input', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const contents = Object.values(tree.nodes).filter((n) => n.type === 'ui.Field.Content');
    for (const content of contents) {
      expect(content.children.length).toBe(1);
      const child = tree.nodes[content.children[0] as string];
      expect(child?.type).toBe('ui.Input');
    }
  });

  it('Input.type is one of allowed enum values', () => {
    const allowed = new Set(['text', 'password', 'email', 'tel', 'number']);
    const tree = generate(FORM_PRESET, { seed: 7 });
    const inputs = Object.values(tree.nodes).filter((n) => n.type === 'ui.Input');
    for (const input of inputs) {
      expect(allowed.has(input.props.type as string)).toBe(true);
    }
  });

  it('Field.Label text comes from wordbank', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const labels = Object.values(tree.nodes).filter((n) => n.type === 'ui.Field.Label');
    for (const label of labels) {
      expect(FIELD_LABELS).toContain(label.props.children as string);
    }
  });

  it('Card.Title text comes from wordbank (when Header present)', () => {
    const tree = generate(FORM_PRESET, { seed: 5 });
    const titles = Object.values(tree.nodes).filter((n) => n.type === 'ui.Card.Title');
    for (const title of titles) {
      expect(CARD_TITLES).toContain(title.props.children as string);
    }
  });

  it('Button text comes from one of the wordbanks (primary OR secondary)', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    const buttons = Object.values(tree.nodes).filter((n) => n.type === 'ui.Button');
    for (const btn of buttons) {
      const text = btn.props.children as string;
      const all = [...BUTTON_PRIMARY_TEXTS, ...BUTTON_SECONDARY_TEXTS];
      expect(all).toContain(text);
    }
  });

  it('all child-of-parent placements respect manifest accepts-rules', () => {
    const tree = generate(FORM_PRESET, { seed: 7 });
    for (const node of Object.values(tree.nodes)) {
      for (const childId of node.children) {
        const child = tree.nodes[childId];
        if (!child) continue;
        expect(canAcceptChild(node.type, child.type)).toBe(true);
      }
    }
  });
});
