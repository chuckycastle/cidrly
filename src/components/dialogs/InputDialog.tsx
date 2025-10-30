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
  helperText?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  validate?: (value: string) => boolean | string;
  allowedChars?: RegExp; // Optional regex to restrict input characters
}

export const InputDialog: React.FC<InputDialogProps> = ({
  title,
  label,
  helperText,
  defaultValue = '',
  onSubmit,
  onCancel,
  validate,
  allowedChars,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>('');

  // Reset value when defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
    setError('');
  }, [defaultValue, title, label]);

  // Handle Escape and conditional 'q' key to cancel dialog
  // 'q' only closes if it's not an allowed character (e.g., IP addresses)
  // This allows 'q' in filenames but closes IP address dialogs
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // If allowedChars is set and 'q' is not allowed, treat 'q' as close
    if (input === 'q' && allowedChars && !allowedChars.test('q')) {
      onCancel();
    }
  });

  // Handle value changes with character filtering
  const handleChange = (newValue: string): void => {
    // If allowedChars is specified, filter out invalid characters
    if (allowedChars) {
      const filteredValue = newValue
        .split('')
        .filter((char) => allowedChars.test(char))
        .join('');
      setValue(filteredValue);
    } else {
      setValue(newValue);
    }
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = (): void => {
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

      {/* Helper text */}
      {helperText && (
        <Box marginBottom={1}>
          <Text>{colors.dim(helperText)}</Text>
        </Box>
      )}

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
        <TextInput value={value} onChange={handleChange} onSubmit={handleSubmit} />
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
