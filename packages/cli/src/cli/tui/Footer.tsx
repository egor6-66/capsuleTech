/** @jsxImportSource react */
import { Box, Text } from 'ink';
import { ICONS } from './icons';
import { theme } from './theme';

interface Hint {
  keys: string;
  label: string;
}

const HINTS: Hint[] = [
  { keys: '↑↓', label: 'items' },
  { keys: '←→', label: 'tabs' },
  { keys: ICONS.enter, label: 'run' },
  { keys: 'esc', label: 'exit' },
];

export const Footer = () => (
  <Box paddingX={1}>
    {HINTS.map((h, idx) => (
      <Box key={h.keys} marginRight={idx === HINTS.length - 1 ? 0 : 2}>
        <Text color={theme.brand} bold>
          {h.keys}
        </Text>
        <Text color={theme.textDim}> {h.label}</Text>
      </Box>
    ))}
  </Box>
);
