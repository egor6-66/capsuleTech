/** @jsxImportSource react */
import { Box, Text } from 'ink';
import type { Category } from '../../commands';
import { CATEGORY_META } from '../../commands';
import { theme } from './theme';

interface HeaderProps {
  title: string;
  ctxLabel: string;
  categories: Category[];
  activeCategory: Category;
}

export const Header = ({ title, ctxLabel, categories, activeCategory }: HeaderProps) => (
  <Box flexDirection="column">
    <Box justifyContent="space-between" paddingX={1}>
      <Text bold color={theme.brand}>
        ▲ {title}
      </Text>
      <Text color={theme.textDim}>{ctxLabel}</Text>
    </Box>

    <Box paddingX={1} marginTop={0}>
      {categories.map((cat, idx) => {
        const meta = CATEGORY_META[cat];
        const active = cat === activeCategory;
        return (
          <Box key={cat} marginRight={idx === categories.length - 1 ? 0 : 2}>
            <Text
              color={active ? theme.selectionFg : theme.textDim}
              backgroundColor={active ? theme.selectionBg : undefined}
              bold={active}
            >
              {' '}
              {meta.icon} {meta.label}{' '}
            </Text>
          </Box>
        );
      })}
    </Box>
  </Box>
);
