import { mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { Image } from '../image';
import { Typography } from '../typography';
import type { IAvatarProps } from './interfaces';

/**
 * Avatar — composed image primitive for user profiles and team member display.
 *
 * Thin wrapper over Image that:
 * - Forces circle shape (no square option)
 * - Reuses Image's own size scale/CVA directly (no second scale defined here)
 * - Enhances fallback to support string initials (auto-wrapped in Typography)
 *
 * For custom fallback UI (colored backgrounds, icons), pass JSX directly.
 *
 * @example
 * ```tsx
 * // Basic avatar
 * <Avatar src={user.avatar} alt={user.name} />
 *
 * // With string initials fallback
 * <Avatar
 *   src={url}
 *   alt={name}
 *   size="lg"
 *   fallback="AB"
 * />
 *
 * // With custom JSX fallback
 * <Avatar
 *   src={url}
 *   alt={name}
 *   size="md"
 *   fallback={<UserIcon size={16} />}
 * />
 * ```
 */
export const Avatar = (props: IAvatarProps) => {
  useTrace('web-ui.avatar'); // ADR 062
  const merged = mergeProps({ size: 'md' as const }, props);
  const [local, others] = splitProps(merged, ['class', 'style', 'src', 'alt', 'fallback', 'size']);

  const fallback = () =>
    typeof local.fallback === 'string' ? (
      <Typography size="sm" class="font-semibold leading-none">
        {local.fallback}
      </Typography>
    ) : (
      local.fallback
    );

  return (
    <Image
      src={local.src}
      alt={local.alt}
      shape="circle"
      size={local.size}
      class={local.class}
      style={local.style}
      fallback={fallback()}
      {...(others as object)}
    />
  );
};
