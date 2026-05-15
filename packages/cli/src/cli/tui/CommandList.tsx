/** @jsxImportSource react */
import { Box, Text } from 'ink';
import stringWidth from 'string-width';
import type { Command } from '../../commands';
import { theme } from './theme';

interface CommandListProps {
  items: Command[];
  selectedIndex: number;
  width: number;
}

const padToWidth = (s: string, target: number): string => {
  const w = stringWidth(s);
  if (w >= target) return s;
  return s + ' '.repeat(target - w);
};

export const CommandList = ({ items, selectedIndex, width }: CommandListProps) => {
  // Каждая строка: "▸ <label>" — ровно `width - 2` символов (paddingX={1}).
  const innerWidth = Math.max(4, width - 2);
  return (
    <Box flexDirection="column" width={width} paddingX={1} paddingY={0}>
      {items.length === 0 ? (
        <Text color={theme.textDim} italic>
          {padToWidth('Пусто в этом контексте', innerWidth)}
        </Text>
      ) : (
        items.map((cmd, idx) => {
          const active = idx === selectedIndex;
          const prefix = active ? '▸ ' : '  ';
          const raw = prefix + cmd.label;
          return (
            <Text
              key={cmd.id}
              color={active ? theme.brand : theme.textDim}
              bold={active}
            >
              {padToWidth(raw, innerWidth)}
            </Text>
          );
        })
      )}
    </Box>
  );
};
