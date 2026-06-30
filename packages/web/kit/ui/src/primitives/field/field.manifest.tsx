import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { AlertCircle, FormInput, Inbox, Info, Tag } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { FieldContract } from './field.contract';
import { fieldPresets } from './field.presets';

// Contract = root for props (orientation). Manifest extends with Inspector-only field (class).
const fieldBaseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(FieldContract);
if (!fieldBaseProps) throw new Error('FieldContract has no props schema — add rule.props(...)');

const FIELD_DIRECT_CHILDREN = new Set([
  'ui.Field.Label',
  'ui.Field.Content',
  'ui.Field.Description',
  'ui.Field.Error',
]);

const isFieldPart = (type: string) => type.startsWith('ui.Field.');

export const FieldManifest: IPrimitiveManifestEntry = {
  type: 'ui.Field',
  label: 'Field',
  category: 'composition',
  icon: () => <FormInput size={16} />,
  description: 'Form-field: метка + ввод + описание/ошибка',
  accepts: (childType) => FIELD_DIRECT_CHILDREN.has(childType),
  contract: FieldContract,
  defaultProps: {
    orientation: 'vertical',
  },
  styleSlots: ['root'],
  propsSchema: fieldBaseProps.extend({
    class: z.string().optional(),
  }),
  presets: fieldPresets,
};

export const FieldLabelManifest: IPrimitiveManifestEntry = {
  type: 'ui.Field.Label',
  label: 'Field Label',
  category: 'composite',
  icon: () => <Tag size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Label' },
  propsSchema: z.object({
    children: z.string().default('Label'),
    class: z.string().optional(),
  }),
};

export const FieldContentManifest: IPrimitiveManifestEntry = {
  type: 'ui.Field.Content',
  label: 'Field Content',
  category: 'composite',
  icon: () => <Inbox size={16} />,
  accepts: (childType) => !isFieldPart(childType),
  defaultProps: {},
  propsSchema: z.object({
    class: z.string().optional(),
  }),
};

export const FieldDescriptionManifest: IPrimitiveManifestEntry = {
  type: 'ui.Field.Description',
  label: 'Field Description',
  category: 'composite',
  icon: () => <Info size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Description' },
  propsSchema: z.object({
    children: z.string().default('Description'),
    class: z.string().optional(),
  }),
};

export const FieldErrorManifest: IPrimitiveManifestEntry = {
  type: 'ui.Field.Error',
  label: 'Field Error',
  category: 'composite',
  icon: () => <AlertCircle size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Error' },
  propsSchema: z.object({
    children: z.string().default('Error'),
    class: z.string().optional(),
  }),
};
