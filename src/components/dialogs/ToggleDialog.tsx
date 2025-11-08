/**
 * ToggleDialog Component
 * Modal for toggling a boolean preference with Space key
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { colors } from '../../themes/colors.js';

export interface ToggleDialogProps {
  title: string;
  label: string;
  initialValue: boolean;
  enabledText?: string;
  disabledText?: string;
  onSubmit: (value: boolean) => void;
  onCancel: () => void;
}

export const ToggleDialog: React.FC<ToggleDialogProps> = ({
  title,
  label,
  initialValue,
  enabledText = 'Enabled',
  disabledText = 'Disabled',
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  // Handle keyboard input
  useInput((_input, key) => {
    // Escape or vim 'q' to cancel
    if (key.escape || _input === 'q') {
      onCancel();
      return;
    }

    // Enter to submit
    if (key.return) {
      onSubmit(value);
      return;
    }

    // Space to toggle
    if (_input === ' ') {
      setValue(!value);
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.accent(title)}</Text>
      </Box>

      {/* Label */}
      <Box marginBottom={1}>
        <Text>{label}</Text>
      </Box>

      {/* Toggle Display */}
      <Box marginBottom={1}>
        <Text>
          {value ? '☑' : '☐'} {value ? colors.success(enabledText) : colors.muted(disabledText)}
        </Text>
      </Box>

      {/* Help text */}
      <Box marginBottom={1}>
        <Text dimColor>Press Space to toggle</Text>
      </Box>

      {/* Actions */}
      <Box>
        <Text dimColor>Enter to save · Esc to cancel</Text>
      </Box>
    </Box>
  );
};
