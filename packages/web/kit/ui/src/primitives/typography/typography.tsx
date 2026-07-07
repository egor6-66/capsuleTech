import { cn, createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useTrace } from '../../internal/useTrace';
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

const WEIGHT: Record<NonNullable<ITypographyProps['weight']>, string> = {
  thin: 'font-thin',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
};

export const Typography = (props: ITypographyProps) => {
  useTrace('web-ui.typography'); // ADR 062
  // 1. Устанавливаем дефолты
  const merged = mergeProps({ variant: 'p' }, props);

  // 2. Разделяем пропсы
  const [local, variantProps, presentational, others] = splitProps(
    merged,
    ['class', 'style', 'as'],
    ['variant', 'color'],
    ['align', 'tone', 'size', 'weight', 'mono', 'dim'],
  );

  // 3. Создаем реактивные стили через CVA
  const styleProps = mergeProps(variantProps, {
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
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
      // weight/mono override the variant's font-weight/family (tailwind-merge wins)
      presentational.weight && WEIGHT[presentational.weight],
      presentational.mono && 'font-mono',
      // dim: always add transition; toggle opacity
      'transition-opacity duration-200',
      presentational.dim ? 'opacity-0' : 'opacity-100',
    );

  // 5. Логика выбора тега
  const componentTag = () => {
    if (local.as) return local.as;
    // Variants that are not real HTML tags render as <p>.
    if (variantProps.variant === 'lead' || variantProps.variant === 'overline') return 'p';
    return variantProps.variant || 'p';
  };

  return <Dynamic component={componentTag()} class={finalClass()} style={style()} {...others} />;
};
