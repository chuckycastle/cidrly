/**
 * PreferencesDialog Component
 * Modal for configuring user preferences (growth percentage)
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import { isValidGrowthPercentage } from '../../infrastructure/config/validation-rules.js';
import { colors } from '../../themes/colors.js';

export interface PreferencesDialogProps {
  currentGrowthPercentage: number;
  onSubmit: (growthPercentage: number) => void;
  onCancel: () => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({
  currentGrowthPercentage,
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(String(currentGrowthPercentage));
  const [error, setError] = useState<string>('');

  // Reset value when currentGrowthPercentage changes
  useEffect(() => {
    setValue(String(currentGrowthPercentage));
    setError('');
  }, [currentGrowthPercentage]);

  // Handle Escape key to cancel dialog
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const validate = (input: string): boolean | string => {
    const num = Number(input);

    if (input.trim() === '') {
      return 'Growth percentage is required';
    }

    if (isNaN(num)) {
      return 'Growth percentage must be a number';
    }

    if (!Number.isInteger(num)) {
      return 'Growth percentage must be a whole number';
    }

    if (!isValidGrowthPercentage(num)) {
      return 'Growth percentage must be between 0% and 300%';
    }

    return true;
  };

  const handleSubmit = (): void => {
    const result = validate(value);
    if (result !== true) {
      setError(typeof result === 'string' ? result : 'Invalid input');
      return;
    }
    onSubmit(Number(value));
  };

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Preferences')}</Text>
      </Box>

      {/* Description */}
      <Box marginBottom={1}>
        <Text>{colors.dim('Configure subnet capacity planning growth percentage')}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Growth percentage explanation */}
      <Box marginBottom={1} flexDirection="column">
        <Text>{colors.muted('Growth Percentage:')}</Text>
        <Text>{colors.dim('  • 0% = Exact capacity (no growth)')}</Text>
        <Text>{colors.dim('  • 100% = Double capacity (default)')}</Text>
        <Text>{colors.dim('  • 200% = Triple capacity')}</Text>
        <Text>{colors.dim('  • 300% = Quadruple capacity')}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Label */}
      <Box marginBottom={1}>
        <Text>{colors.muted('Growth Percentage (0-300)')}</Text>
      </Box>

      {/* Input */}
      <Box>
        <Text>{colors.accent('› ')}</Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
        <Text>{colors.muted('%')}</Text>
      </Box>

      {/* Error message */}
      {error && (
        <Box marginTop={1}>
          <Text>{colors.error(`✕ ${error}`)}</Text>
        </Box>
      )}

      {/* Divider */}
      <Box marginTop={1} marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Help text */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('Enter')}</Text>
        <Text>{colors.dim(' to save, ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to cancel')}</Text>
      </Box>
    </Box>
  );
};
