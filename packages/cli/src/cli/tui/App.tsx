/** @jsxImportSource react */
import { Box, useApp, useInput, useStdout } from 'ink';
import { useMemo, useState } from 'react';
import type { Category, Command } from '../../commands';
import { CommandList } from './CommandList';
import { Detail } from './Detail';
import { Footer } from './Footer';
import { Header } from './Header';

export interface AppPick {
  kind: 'command' | 'exit';
  command?: Command;
}

interface AppProps {
  title: string;
  ctxLabel: string;
  groups: Map<Category, Command[]>;
  onPick: (pick: AppPick) => void;
}

export const App = ({ title, ctxLabel, groups, onPick }: AppProps) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const cols = Math.min(stdout?.columns ?? 80, 96);
  const listWidth = Math.max(22, Math.floor(cols * 0.32));
  const detailWidth = Math.max(28, cols - listWidth - 4);
  // Reserved: header title row (1) + tabs row (1) + marginTop before content (1)
  // + marginTop before footer (1) + footer row (1) + safety (1) = 6.
  const rows = stdout?.rows ?? 24;
  const viewportRows = Math.max(3, rows - 6);

  const categories = useMemo(() => [...groups.keys()], [groups]);
  const [tab, setTab] = useState(0);
  const [item, setItem] = useState(0);

  const activeCategory = categories[tab] ?? categories[0];
  const items = (activeCategory && groups.get(activeCategory)) ?? [];
  const selected = items[Math.min(item, items.length - 1)];

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onPick({ kind: 'exit' });
      exit();
      return;
    }
    if (key.return) {
      if (selected) {
        onPick({ kind: 'command', command: selected });
        exit();
      }
      return;
    }
    if (key.leftArrow || input === 'h') {
      setTab((t) => (t - 1 + categories.length) % categories.length);
      setItem(0);
      return;
    }
    if (key.rightArrow || key.tab || input === 'l') {
      setTab((t) => (t + 1) % categories.length);
      setItem(0);
      return;
    }
    if (key.upArrow || input === 'k') {
      setItem((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
      return;
    }
    if (key.downArrow || input === 'j') {
      setItem((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      return;
    }
    // Digit hotkey jumps tab
    const n = Number.parseInt(input, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= categories.length) {
      setTab(n - 1);
      setItem(0);
    }
  });

  return (
    <Box flexDirection="column" width={cols}>
      <Header
        title={title}
        ctxLabel={ctxLabel}
        categories={categories}
        activeCategory={activeCategory ?? ('create' as Category)}
      />
      <Box marginTop={1} height={viewportRows}>
        <CommandList
          items={items}
          selectedIndex={item}
          width={listWidth}
          viewportRows={viewportRows}
        />
        <Detail command={selected} width={detailWidth} viewportRows={viewportRows} />
      </Box>
      <Box marginTop={1}>
        <Footer />
      </Box>
    </Box>
  );
};
