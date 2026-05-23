import {
  BUTTON_PRIMARY_TEXTS,
  BUTTON_SECONDARY_TEXTS,
  CARD_DESCRIPTIONS,
  CARD_TITLES,
  FIELD_DESCRIPTIONS,
  FIELD_LABELS,
  labelToInputType,
  labelToPlaceholder,
} from '../wordbank';
import type { IPreset, IPropsRefiner } from '../types';

/**
 * Стабильный «случайный» index из строки — позволяет refineProps выбирать
 * элемент из wordbank без доступа к engine'овскому RNG (engine вызывает
 * refineProps уже после fuzz'инга, RNG-state идёт дальше). Использует
 * простой хэш строки: достаточно для разнообразия, не нужна криптография.
 */
const stableIndex = (seed: string, modulo: number): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % modulo;
};

/**
 * Перебивает `children` строкой из wordbank'а. Используем id или fallback —
 * не зависим от engine RNG здесь (engine уже выдал nodes, refineProps по
 * сути — post-process).
 */
const refineCardTitle: IPropsRefiner = (props) => ({
  ...props,
  children: CARD_TITLES[stableIndex(String(props.children ?? 'title'), CARD_TITLES.length)],
});

const refineCardDescription: IPropsRefiner = (props) => ({
  ...props,
  children:
    CARD_DESCRIPTIONS[stableIndex(String(props.children ?? 'desc'), CARD_DESCRIPTIONS.length)],
});

const refineFieldLabel: IPropsRefiner = (props) => ({
  ...props,
  children: FIELD_LABELS[stableIndex(String(props.children ?? 'label'), FIELD_LABELS.length)],
});

const refineFieldDescription: IPropsRefiner = (props) => ({
  ...props,
  children:
    FIELD_DESCRIPTIONS[stableIndex(String(props.children ?? 'fdesc'), FIELD_DESCRIPTIONS.length)],
});

/**
 * Согласует placeholder и type у Input с подразумеваемым label. Сам label
 * Input не знает — берём из подсказки `props.placeholder` если уже задан
 * fuzzer'ом, иначе используем generic 'text'.
 *
 * NB: «настоящая» согласованность label↔input возможна только если Input
 * знает label соседа. В текущей плоской структуре Field.Content > Input
 * мы не имеем доступа к sibling-узлу — генерим input как stand-alone,
 * Field.Label рядом получает свой случайный label из wordbank.
 *
 * Чтобы UX не разваливался, fuzzer'у разрешено выбрать любой type — лучше
 * пусть будет хаотично разнообразно, чем фальшиво «согласовано».
 */
const refineInput: IPropsRefiner = (props) => {
  const placeholder = String(props.placeholder ?? '');
  const sourceLabel = placeholder || FIELD_LABELS[stableIndex(placeholder, FIELD_LABELS.length)] || 'Text';
  return {
    ...props,
    type: labelToInputType(sourceLabel),
    placeholder: labelToPlaceholder(sourceLabel),
  };
};

const refineButtonPrimary: IPropsRefiner = (props) => ({
  ...props,
  children:
    BUTTON_PRIMARY_TEXTS[
      stableIndex(String(props.children ?? 'btn'), BUTTON_PRIMARY_TEXTS.length)
    ],
  variant: 'default',
});

const refineButtonSecondary: IPropsRefiner = (props) => ({
  ...props,
  children:
    BUTTON_SECONDARY_TEXTS[
      stableIndex(String(props.children ?? 'btn2'), BUTTON_SECONDARY_TEXTS.length)
    ],
  variant: 'outline',
});

/**
 * FORM_PRESET — грамматика для генерации форм. Структура (всё опционально
 * кроме Content):
 *
 *   ui.Card
 *   ├── ui.Card.Header (70%)
 *   │   ├── ui.Card.Title (always внутри Header)
 *   │   └── ui.Card.Description (50%)
 *   ├── ui.Card.Content (always)
 *   │   └── 2..5 × ui.Field
 *   │       ├── ui.Field.Label
 *   │       ├── ui.Field.Content
 *   │       │   └── ui.Input
 *   │       └── ui.Field.Description (30%)
 *   └── ui.Card.Footer (80%)
 *       └── 1..2 × ui.Button (variant random)
 *
 * Соответствует accepts-правилам manifests/card.ts + field.ts.
 */
export const FORM_PRESET: IPreset = {
  name: 'form',
  rootCandidates: [
    {
      type: 'ui.Card',
      weight: 1,
      slots: [
        {
          name: 'header',
          probability: 0.7,
          pick: [
            {
              type: 'ui.Card.Header',
              slots: [
                {
                  name: 'title',
                  pick: [{ type: 'ui.Card.Title', refineProps: refineCardTitle }],
                },
                {
                  name: 'description',
                  probability: 0.5,
                  pick: [
                    {
                      type: 'ui.Card.Description',
                      refineProps: refineCardDescription,
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
                  name: 'fields',
                  countRange: [2, 5],
                  pick: [
                    {
                      type: 'ui.Field',
                      slots: [
                        {
                          name: 'label',
                          pick: [{ type: 'ui.Field.Label', refineProps: refineFieldLabel }],
                        },
                        {
                          name: 'content',
                          pick: [
                            {
                              type: 'ui.Field.Content',
                              slots: [
                                {
                                  name: 'input',
                                  pick: [{ type: 'ui.Input', refineProps: refineInput }],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          name: 'description',
                          probability: 0.3,
                          pick: [
                            {
                              type: 'ui.Field.Description',
                              refineProps: refineFieldDescription,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'footer',
          probability: 0.8,
          pick: [
            {
              type: 'ui.Card.Footer',
              slots: [
                {
                  name: 'actions',
                  countRange: [1, 2],
                  pick: [
                    { type: 'ui.Button', weight: 3, refineProps: refineButtonPrimary },
                    { type: 'ui.Button', weight: 1, refineProps: refineButtonSecondary },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
