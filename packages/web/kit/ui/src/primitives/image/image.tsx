import { createStyle } from '@capsuletech/web-style';
import {
  Fallback as KobalteImageFallback,
  Img as KobalteImageImg,
  Root as KobalteImageRoot,
} from '@kobalte/core/image';
import { mergeProps, Show, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { IImageProps } from './interfaces';
import { imageCva } from './variants';

/**
 * Image — responsive image primitive with fallback support.
 *
 * Backed by @kobalte/core Image for accessibility and semantic structure.
 * Supports two shape variants (square/circle) and five size options (xs/sm/md/lg/xl).
 *
 * Avatar usage: use shape="circle" with a fallback for initials or icons.
 *
 * @example
 * ```tsx
 * // Basic image
 * <Image src="/avatar.png" alt="Profile" shape="circle" size="md" />
 *
 * // With fallback (avatar pattern)
 * <Image
 *   src={userAvatarUrl}
 *   alt={userName}
 *   shape="circle"
 *   size="md"
 *   fallback={<Typography variant="sm" class="font-semibold">{initials}</Typography>}
 * />
 *
 * // Different sizes
 * <Image src="/thumb.png" alt="Thumbnail" size="sm" />
 * <Image src="/cover.png" alt="Cover" size="lg" shape="square" />
 * ```
 */
export const Image = (props: IImageProps) => {
  useTrace('web-ui.image'); // ADR 062
  const merged = mergeProps(props);
  const [local, variants, others] = splitProps(
    merged,
    ['class', 'style', 'src', 'alt', 'fallback'],
    ['shape', 'size'],
  );

  const { className, style } = createStyle(imageCva, {
    ...variants,
    class: local.class,
    style: local.style,
  });

  return (
    <KobalteImageRoot class={className()} style={style()} {...(others as object)}>
      <KobalteImageImg src={local.src} alt={local.alt} class="h-full w-full object-cover" />
      <Show when={local.fallback}>
        <KobalteImageFallback class="absolute inset-0 flex items-center justify-center bg-muted">
          {local.fallback}
        </KobalteImageFallback>
      </Show>
    </KobalteImageRoot>
  );
};
