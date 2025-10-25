/**
 * ConfirmDialog Component
 * Modern confirmation modal with subtle styling
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { colors, symbols } from '../../themes/colors.js';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: (result: boolean) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, onConfirm }) => {
  const [focused, setFocused] = useState<'yes' | 'no'>('no');

  useInput((input, key) => {
    if (input === 'y') {
      onConfirm(true);
    } else if (input === 'n' || key.escape) {
      onConfirm(false);
    } else if (key.leftArrow) {
      setFocused('yes');
    } else if (key.rightArrow) {
      setFocused('no');
    } else if (key.return) {
      onConfirm(focused === 'yes');
    }
  });

  return (
    <Box
      borderStyle="double"
      borderColor="yellow"
      paddingX={3}
      paddingY={1}
      flexDirection="column"
      overflow="visible"
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.warning(title)}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Message */}
      <Box marginBottom={1}>
        <Text>{colors.muted(message)}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Buttons */}
      <Box justifyContent="center" columnGap={3} marginBottom={1}>
        <Box paddingX={3} paddingY={0}>
          {focused === 'yes' ? (
            <Text bold>
              {colors.success(symbols.selected)} {colors.success('Yes')}
            </Text>
          ) : (
            <Text>{colors.dim('  Yes')}</Text>
          )}
        </Box>
        <Box paddingX={3} paddingY={0}>
          {focused === 'no' ? (
            <Text bold>
              {colors.error(symbols.selected)} {colors.error('No')}
            </Text>
          ) : (
            <Text>{colors.dim('  No')}</Text>
          )}
        </Box>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Help text */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('y/n')}</Text>
        <Text>{colors.dim(' or ')}</Text>
        <Text>{colors.muted('←→')}</Text>
        <Text>{colors.dim(' then ')}</Text>
        <Text>{colors.muted('Enter')}</Text>
      </Box>
    </Box>
  );
};
