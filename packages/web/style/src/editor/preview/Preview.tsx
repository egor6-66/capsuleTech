import { SampleAuth } from './SampleAuth';
import { SampleButtons } from './SampleButtons';
import { SampleMetrics } from './SampleMetrics';
import { SamplePricing } from './SamplePricing';

/**
 * Превью-сетка. 12-колоночный grid в стиле shadcn'овской «showcase» страницы:
 * Auth (левая колонка, 5/12), правая часть — metrics + pricing + buttons.
 *
 * Все sample-компоненты пишут только в semantic-токены (`bg-card`,
 * `text-foreground`, `bg-primary`, ...), поэтому редактирование темы
 * прозрачно меняет всё разом.
 */
export const Preview = () => (
  <div class="h-full overflow-y-auto bg-background text-foreground p-8">
    <div class="max-w-3xl mx-auto flex flex-col gap-4">
      <div class="grid grid-cols-12 gap-4 items-start">
        <div class="col-span-5">
          <SampleAuth />
        </div>
        <div class="col-span-7 flex flex-col gap-4">
          <SampleMetrics />
          <SamplePricing />
        </div>
      </div>
      <SampleButtons />
    </div>
  </div>
);
