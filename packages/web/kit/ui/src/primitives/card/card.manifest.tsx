import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { AlignJustify, AlignLeft, CreditCard, Heading1, PanelBottom, Type } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { CardContract } from './card.contract';
import { cardPresets } from './card.presets';

// Contract = root for props (elevation). Manifest extends with Inspector-only field (class).
const cardBaseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(CardContract);
if (!cardBaseProps) throw new Error('CardContract has no props schema — add rule.props(...)');

const CARD_DIRECT_CHILDREN = new Set([
  'ui.Card.Header',
  'ui.Card.Title',
  'ui.Card.Description',
  'ui.Card.Content',
  'ui.Card.Footer',
]);

const isCardPart = (type: string) => type.startsWith('ui.Card.');

export const CardManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card',
  label: 'Card',
  category: 'composition',
  icon: () => <CreditCard size={16} />,
  description: 'Контейнер-карточка с шапкой/контентом/футером',
  accepts: (childType) => CARD_DIRECT_CHILDREN.has(childType),
  contract: CardContract,
  docSlug: 'web-ui/primitives/card',
  defaultProps: {
    class: 'w-full max-w-sm',
  },
  styleSlots: ['root'],
  propsSchema: cardBaseProps.extend({
    class: z.string().optional(),
    // Entity-mode slots (data-driven Card). Text slots as strings for the
    // inspector; runtime also accepts JSX. Setting any slot switches Card to
    // the entity layout (see ICardEntityProps).
    title: z.string().optional(),
    titleAction: z.string().optional(),
    subtitle: z.string().optional(),
    translation: z.string().optional(),
    definition: z.string().optional(),
    badge: z.string().optional(),
    tags: z.array(z.string()).optional(),
    meta: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    align: z.enum(['start', 'center']).optional(),
  }),
  presets: cardPresets,
};

export const CardHeaderManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card.Header',
  label: 'Card Header',
  category: 'composite',
  icon: () => <Heading1 size={16} />,
  accepts: (childType) => childType === 'ui.Card.Title' || childType === 'ui.Card.Description',
  defaultProps: {},
  propsSchema: z.object({
    class: z.string().optional(),
  }),
};

export const CardTitleManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card.Title',
  label: 'Card Title',
  category: 'composite',
  icon: () => <Type size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Title' },
  propsSchema: z.object({
    children: z.string().default('Title'),
    class: z.string().optional(),
  }),
};

export const CardDescriptionManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card.Description',
  label: 'Card Description',
  category: 'composite',
  icon: () => <AlignLeft size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Description' },
  propsSchema: z.object({
    children: z.string().default('Description'),
    class: z.string().optional(),
  }),
};

export const CardContentManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card.Content',
  label: 'Card Content',
  category: 'composite',
  icon: () => <AlignJustify size={16} />,
  accepts: (childType) => !isCardPart(childType),
  defaultProps: {},
  propsSchema: z.object({
    class: z.string().optional(),
  }),
};

export const CardFooterManifest: IPrimitiveManifestEntry = {
  type: 'ui.Card.Footer',
  label: 'Card Footer',
  category: 'composite',
  icon: () => <PanelBottom size={16} />,
  accepts: (childType) => !isCardPart(childType),
  defaultProps: {},
  propsSchema: z.object({
    class: z.string().optional(),
  }),
};
