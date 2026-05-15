/** @jsxImportSource react */
import { Box, Text } from 'ink';
import type { Command } from '../../commands';
import { theme } from './theme';

interface DetailProps {
  command: Command | undefined;
  width: number;
}

export const Detail = ({ command, width }: DetailProps) => {
  if (!command) {
    return (
      <Box
        width={width}
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
      paddingX={2}
      paddingY={0}
      borderStyle="single"
      borderColor={theme.textDim}
      borderTop={false}
      borderBottom={false}
      borderRight={false}
    >
      <Text bold color={theme.brand}>
        {command.label}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.text} wrap="wrap">
          {command.description}
        </Text>
      </Box>
    </Box>
  );
};
