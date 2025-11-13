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
  preprocessInput?: (value: string) => string; // Optional preprocessing function (e.g., path unescaping)
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
  preprocessInput,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>('');

  // Reset value when defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
    setError('');
  }, [defaultValue, title, label]);

  // Reprocess value if it contains unescaped sequences
  // This handles cases where ink-text-input doesn't call onChange for paste operations
  useEffect(() => {
    if (preprocessInput && value) {
      const processed = preprocessInput(value);
      if (processed !== value) {
        // Use setTimeout to avoid infinite loops and allow React to batch updates
        const timer = setTimeout(() => {
          setValue(processed);
        }, 0);
        return () => {
          clearTimeout(timer);
        };
      }
    }
    return undefined;
  }, [value, preprocessInput]);

  // Handle Escape key to cancel dialog
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
  });

  // Handle value changes with character filtering and preprocessing
  const handleChange = (newValue: string): void => {
    let processedValue = newValue;

    // Apply preprocessing first
    if (preprocessInput) {
      processedValue = preprocessInput(processedValue);
    }

    // Then apply character filtering if specified
    if (allowedChars) {
      processedValue = processedValue
        .split('')
        .filter((char) => allowedChars.test(char))
        .join('');
    }

    setValue(processedValue);

    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = (): void => {
    // Trim whitespace from input (value is already preprocessed via computed value)
    const submittedValue = value.trim();

    if (validate) {
      const result = validate(submittedValue);
      if (result !== true) {
        setError(typeof result === 'string' ? result : 'Invalid input');
        return;
      }
    }
    onSubmit(submittedValue);
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
