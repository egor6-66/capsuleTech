import type { Preview } from 'storybook-solidjs-vite';

import '../../style/src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: 'oklch(0.145 0 0)' },
        { name: 'light', value: 'oklch(1 0 0)' },
      ],
    },
  },
  decorators: [
    (Story) => {
      document.documentElement.classList.add('dark');
      return Story();
    },
  ],
};

export default preview;
