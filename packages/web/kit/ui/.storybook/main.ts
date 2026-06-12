import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: [],
  framework: {
    name: getAbsolutePath('storybook-solidjs-vite'),
    options: {
      builder: {
        viteConfigPath: '.storybook/vite.config.ts',
      },
    },
  },
  async viteFinal(viteConfig) {
    const { default: tailwind } = await import('@tailwindcss/vite');
    // Tailwind v4 plugin must be first so it intercepts @import "tailwindcss"
    // before Vite's own CSS handler; placing it last causes preflight/utilities
    // to be silently dropped.
    viteConfig.plugins = [tailwind(), ...(viteConfig.plugins ?? [])];
    return viteConfig;
  },
};

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

export default config;
