/**
 * InputDialog Component
 * Modern modal for text input
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import { colors } from '../../themes/colors.js';

export interface InputDialogProps {
  title: string;
  label: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  validate?: (value: string) => boolean | string;
}

export const InputDialog: React.FC<InputDialogProps> = ({
  title,
  label,
  defaultValue = '',
  onSubmit,
  onCancel,
  validate,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>('');

  // Reset value when defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
    setError('');
  }, [defaultValue, title, label]);

  // Handle Escape key to cancel dialog
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    if (validate) {
      const result = validate(value);
      if (result !== true) {
        setError(typeof result === 'string' ? result : 'Invalid input');
        return;
      }
    }
    onSubmit(value);
  };

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate(title)}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Label */}
      <Box marginBottom={1}>
        <Text>{colors.muted(label)}</Text>
      </Box>

      {/* Input */}
      <Box>
        <Text>{colors.accent('› ')}</Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>

      {/* Error message */}
      {error && (
        <Box marginTop={1}>
          <Text>{colors.error(`✕ ${error}`)}</Text>
        </Box>
      )}

      {/* Divider */}
      <Box marginTop={1} marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Help text */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('Enter')}</Text>
        <Text>{colors.dim(' to submit, ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to cancel')}</Text>
      </Box>
    </Box>
  );
};
