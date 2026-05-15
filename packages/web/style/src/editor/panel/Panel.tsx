import { Palette, Ruler, Spline, SunMoon, Type } from 'lucide-solid';
import type { ITheme } from '../types';
import { ExportButton } from './ExportButton';
import { FontControl } from './FontControl';
import { ModeToggle } from './ModeToggle';
import { OklchSliders } from './OklchSliders';
import { PresetPicker } from './PresetPicker';
import { RadiusControl } from './RadiusControl';
import { Section } from './Section';
import { SpacingControl } from './SpacingControl';

interface IProps {
  theme: ITheme;
  onChange: (patch: Partial<ITheme>) => void;
}

/**
 * Левая колонка редактора. shadcn-стиль: заголовок страницы наверху,
 * секции снизу разделены тонкой границей, sticky-footer с export-кнопкой.
 */
export const Panel = (props: IProps) => (
  <div class="flex flex-col h-full">
    <header class="px-6 py-5 border-b border-border">
      <h2 class="text-lg font-semibold tracking-tight">Theme</h2>
      <p class="text-xs text-muted-foreground mt-1">
        Настройте цвет, форму и шрифт — превью обновится мгновенно.
      </p>
    </header>

    <div class="flex-1 overflow-y-auto px-6">
      <Section icon={SunMoon} title="Режим" description="Светлая или тёмная тема для превью">
        <ModeToggle mode={props.theme.mode} onChange={(mode) => props.onChange({ mode })} />
      </Section>

      <Section icon={Palette} title="Primary" description="Акцентный цвет — кнопки, фокус, ссылки">
        <div class="flex flex-col gap-3">
          <PresetPicker
            current={props.theme.primary}
            onPick={(primary) => props.onChange({ primary })}
          />
          <details class="text-xs">
            <summary class="cursor-pointer text-muted-foreground hover:text-foreground select-none">
              Тонкая подстройка (OKLCH)
            </summary>
            <div class="mt-3">
              <OklchSliders
                value={props.theme.primary}
                onChange={(primary) => props.onChange({ primary })}
              />
            </div>
          </details>
        </div>
      </Section>

      <Section icon={Spline} title="Скругление" description="Радиус углов компонентов">
        <RadiusControl
          value={props.theme.radius}
          onChange={(radius) => props.onChange({ radius })}
        />
      </Section>

      <Section icon={Ruler} title="Отступы" description="Базовый шаг spacing'а">
        <SpacingControl
          value={props.theme.spacingBase}
          onChange={(spacingBase) => props.onChange({ spacingBase })}
        />
      </Section>

      <Section icon={Type} title="Шрифт" description="Семейство и базовый размер">
        <FontControl
          family={props.theme.fontFamily}
          size={props.theme.fontBaseSize}
          onFamilyChange={(fontFamily) => props.onChange({ fontFamily })}
          onSizeChange={(fontBaseSize) => props.onChange({ fontBaseSize })}
        />
      </Section>
    </div>

    <footer class="px-6 py-4 border-t border-border bg-card/40">
      <ExportButton theme={props.theme} />
    </footer>
  </div>
);
