import type { IPreset, IPropsRefiner } from '../types';

/**
 * CARD_PRODUCT_PRESET — «Карточка товара». Структура:
 *
 *   ui.Card
 *   ├── ui.Card.Header (always)
 *   │   ├── ui.Card.Title     — название товара
 *   │   └── ui.Card.Description — короткое описание
 *   ├── ui.Card.Content (always)
 *   │   └── ui.Typography (variant: muted) — детали / цена
 *   └── ui.Card.Footer (always)
 *       └── ui.Button (variant: default) — CTA
 */

const refineProductTitle: IPropsRefiner = (props) => ({
  ...props,
  children: String(props.children ?? 'Product Name'),
});

const refineProductDescription: IPropsRefiner = (props) => ({
  ...props,
  children: String(props.children ?? 'Short product description'),
});

const refineProductDetail: IPropsRefiner = (props) => ({
  ...props,
  variant: 'muted',
  children: String(props.children ?? 'Details'),
});

const refineCtaButton: IPropsRefiner = (props) => ({
  ...props,
  variant: 'default',
  children: 'Buy Now',
});

export const CARD_PRODUCT_PRESET: IPreset = {
  name: 'card-product',
  rootCandidates: [
    {
      type: 'ui.Card',
      weight: 1,
      slots: [
        {
          name: 'header',
          pick: [
            {
              type: 'ui.Card.Header',
              slots: [
                {
                  name: 'title',
                  pick: [{ type: 'ui.Card.Title', refineProps: refineProductTitle }],
                },
                {
                  name: 'description',
                  pick: [
                    {
                      type: 'ui.Card.Description',
                      refineProps: refineProductDescription,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'content',
          pick: [
            {
              type: 'ui.Card.Content',
              slots: [
                {
                  name: 'detail',
                  pick: [{ type: 'ui.Typography', refineProps: refineProductDetail }],
                },
              ],
            },
          ],
        },
        {
          name: 'footer',
          pick: [
            {
              type: 'ui.Card.Footer',
              slots: [
                {
                  name: 'cta',
                  pick: [{ type: 'ui.Button', refineProps: refineCtaButton }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
