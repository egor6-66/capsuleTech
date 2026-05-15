import { Slider } from './Slider';

interface IProps {
  value: number;
  onChange: (v: number) => void;
}

export const SpacingControl = (props: IProps) => (
  <Slider
    value={props.value}
    min={0.5}
    max={1.5}
    step={0.05}
    precision={2}
    unit="rem"
    onChange={props.onChange}
  />
);
