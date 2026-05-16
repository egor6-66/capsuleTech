/** @jsxImportSource react */
import { Box, Text } from 'ink';
import type { Command } from '../../commands';
import { theme } from './theme';

interface DetailProps {
  command: Command | undefined;
  width: number;
  viewportRows: number;
}

export const Detail = ({ command, width, viewportRows }: DetailProps) => {
  // Полезная ширина текста = width - leftBorder(1) - paddingX_left(2) - paddingX_right(2).
  // Ink-овский `wrap="wrap"` иногда не учитывает paddings корректно, и continuation-
  // строки переноса вылезают за пределы Box, толкая `│` визуально вправо. Явная
  // `width` на внутреннем Box принуждает wrap считать ширину правильно.
  const contentWidth = Math.max(8, width - 5);

  if (!command) {
    return (
      <Box
        width={width}
        height={viewportRows}
        paddingX={2}
        borderStyle="single"
        borderColor={theme.textDim}
        borderTop={false}
        borderBottom={false}
        borderRight={false}
      >
        <Text color={theme.textDim} italic>
          Нет команд для отображения
        </Text>
      </Box>
    );
  }
  return (
    <Box
      flexDirection="column"
      width={width}
      height={viewportRows}
      overflow="hidden"
      paddingX={2}
      paddingY={0}
      borderStyle="single"
      borderColor={theme.textDim}
      borderTop={false}
      borderBottom={false}
      borderRight={false}
    >
      <Box width={contentWidth}>
        <Text bold color={theme.brand} wrap="truncate-end">
          {command.label}
        </Text>
      </Box>
      <Box marginTop={1} width={contentWidth}>
        <Text color={theme.text} wrap="wrap">
          {command.description}
        </Text>
      </Box>
    </Box>
  );
};
