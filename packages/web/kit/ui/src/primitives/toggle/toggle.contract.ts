import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const ToggleContract = defineContract({ name: 'Toggle', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      size: z.enum(['sm', 'md', 'lg']).optional(),
      label: z.string().optional(),
      // Controlled: текущее состояние. Если не задано — режим uncontrolled.
      checked: z.boolean().optional(),
      // Начальное состояние для uncontrolled-режима. Используется в presets,
      // чтобы пресет рендерился в палитре в нужном виде (on/off).
      defaultChecked: z.boolean().optional(),
      disabled: z.boolean().optional(),
      name: z.string().optional(),
      // Forward-compat с Input/Select — форм-семейство. В toggle.tsx не обрабатывается,
      // добавляем только в контракт для согласованности inspector'а.
      'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
    }),
  ),
  // Slots: single root — как у Button/Input. Расширим когда появится реальный кейс.
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'off', props: { size: 'md', label: 'Уведомления' } },
    { name: 'on', props: { size: 'md', label: 'Уведомления', defaultChecked: true } },
    { name: 'sm', props: { size: 'sm', label: 'Компакт' } },
    { name: 'lg', props: { size: 'lg', label: 'Крупный' } },
    { name: 'disabled', props: { size: 'md', label: 'Заблокирован', disabled: true } },
    { name: 'aria-invalid', props: { size: 'md', label: 'Ошибка', 'aria-invalid': 'true' } },
  ]),
]);
