interface IProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Сколько знаков после точки отображать справа. */
  precision?: number;
  /** Единица после числа в подписи (`rem`, `px`...). */
  unit?: string;
}

/**
 * Тёмный slider в стиле shadcn — толстый track, primary-fill, белый thumb.
 * Считается через `<input type=range>` чтобы не возиться с pointer-обработкой
 * самим — а кастомные стили накатываем CSS-классами.
 */
export const Slider = (props: IProps) => (
  <div class="flex items-center gap-3">
    <input
      type="range"
      class="capsule-slider flex-1 h-1.5 rounded-full bg-muted accent-primary cursor-pointer"
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step}
      onInput={(e) => props.onChange(e.currentTarget.valueAsNumber)}
    />
    <span class="text-xs text-muted-foreground font-mono w-14 text-right shrink-0">
      {props.value.toFixed(props.precision ?? 2)}
      {props.unit ?? ''}
    </span>
  </div>
);
