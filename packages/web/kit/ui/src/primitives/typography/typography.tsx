import { cn, createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { ITypographyProps } from './interfaces';
import { typographyCva } from './variants';

// Static lookup tables — Tailwind purge sees all classes in source.

const ALIGN: Record<NonNullable<ITypographyProps['align']>, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

const TONE: Record<NonNullable<ITypographyProps['tone']>, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
  primary: 'text-primary',
};

const SIZE: Record<NonNullable<ITypographyProps['size']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

export const Typography = (props: ITypographyProps) => {
  // 1. Устанавливаем дефолты
  const merged = mergeProps({ variant: 'p' }, props);

  // 2. Разделяем пропсы
  const [local, variantProps, presentational, others] = splitProps(
    merged,
    ['class', 'style', 'as'],
    ['variant', 'color'],
    ['align', 'tone', 'size', 'dim'],
  );

  // 3. Создаем реактивные стили через CVA
  const styleProps = mergeProps(variantProps, {
    get class() { return local.class; },
    get style() { return local.style; },
  });
  const { className, style } = createStyle(typographyCva, styleProps);

  // 4. Объединяем все дополнительные классы (реактивный мемо)
  const finalClass = () =>
    cn(
      className(),
      presentational.align && ALIGN[presentational.align],
      // tone overrides the CVA color variant when provided
      presentational.tone && TONE[presentational.tone],
      presentational.size && SIZE[presentational.size],
      // dim: always add transition; toggle opacity
      'transition-opacity duration-200',
      presentational.dim ? 'opacity-0' : 'opacity-100',
    );

  // 5. Логика выбора тега
  const componentTag = () => {
    if (local.as) return local.as;
    if (variantProps.variant === 'lead') return 'p';
    return variantProps.variant || 'p';
  };

  return <Dynamic component={componentTag()} class={finalClass()} style={style()} {...others} />;
};
