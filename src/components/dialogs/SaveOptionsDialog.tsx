/**
 * SaveOptionsDialog Component
 * Combined dialog for auto-save toggle and save delay configuration
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import { colors } from '../../themes/colors.js';

export interface SaveOptionsDialogProps {
  autoSave: boolean;
  saveDelay: number;
  onSubmit: (autoSave: boolean, saveDelay: number) => void;
  onCancel: () => void;
}

export const SaveOptionsDialog: React.FC<SaveOptionsDialogProps> = ({
  autoSave: initialAutoSave,
  saveDelay: initialSaveDelay,
  onSubmit,
  onCancel,
}) => {
  const [autoSave, setAutoSave] = useState(initialAutoSave);
  const [saveDelay, setSaveDelay] = useState(initialSaveDelay.toString());
  const [focusedField, setFocusedField] = useState<'toggle' | 'delay'>('toggle');
  const [error, setError] = useState<string | null>(null);

  // Handle keyboard input
  useInput((_input, key) => {
    // Escape or vim 'q' to cancel
    if (key.escape || _input === 'q') {
      onCancel();
      return;
    }

    // Enter to submit
    if (key.return) {
      handleSubmit();
      return;
    }

    // Tab or vim 'j' to cycle forward
    if (key.tab || _input === 'j') {
      setFocusedField(focusedField === 'toggle' ? 'delay' : 'toggle');
      return;
    }

    // Vim 'k' to cycle backward
    if (_input === 'k') {
      setFocusedField(focusedField === 'toggle' ? 'delay' : 'toggle');
      return;
    }

    // Space to toggle auto-save when focused
    if (focusedField === 'toggle' && _input === ' ') {
      setAutoSave(!autoSave);
      setError(null);
      return;
    }
  });

  const handleDelayChange = (value: string): void => {
    // Only allow digits
    const filtered = value.replace(/[^0-9]/g, '');
    setSaveDelay(filtered);
    setError(null);
  };

  const handleSubmit = (): void => {
    const delay = parseInt(saveDelay, 10);

    // Validate delay
    if (Number.isNaN(delay)) {
      setError('Save delay must be a number');
      return;
    }
    if (delay < 100) {
      setError('Save delay must be at least 100ms');
      return;
    }
    if (delay > 5000) {
      setError('Save delay must be at most 5000ms');
      return;
    }

    onSubmit(autoSave, delay);
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.accent('Save Options')}</Text>
      </Box>

      {/* Auto-Save Toggle */}
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text>{focusedField === 'toggle' ? colors.accent('▶ ') : '  '}</Text>
          <Text>Auto-Save: </Text>
          <Text>
            {autoSave ? '☑' : '☐'} {autoSave ? colors.success('Enabled') : colors.muted('Disabled')}
          </Text>
        </Box>
        {focusedField === 'toggle' && (
          <Box marginLeft={4}>
            <Text dimColor>Press Space to toggle</Text>
          </Box>
        )}
      </Box>

      {/* Save Delay Input */}
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text>{focusedField === 'delay' ? colors.accent('▶ ') : '  '}</Text>
          <Text>Save Delay (ms): </Text>
          {focusedField === 'delay' ? (
            <TextInput value={saveDelay} onChange={handleDelayChange} placeholder="500" />
          ) : (
            <Text>{saveDelay}ms</Text>
          )}
        </Box>
        {focusedField === 'delay' && (
          <Box marginLeft={4}>
            <Text dimColor>Valid range: 100-5000ms</Text>
          </Box>
        )}
      </Box>

      {/* Error Message */}
      {error && (
        <Box marginBottom={1}>
          <Text>{colors.error(`✗ ${error}`)}</Text>
        </Box>
      )}

      {/* Help text */}
      <Box marginBottom={1}>
        <Text dimColor>Tab to switch fields · Enter to save · Esc to cancel</Text>
      </Box>

      {/* Description */}
      {autoSave && (
        <Box>
          <Text dimColor>Plan will auto-save {saveDelay}ms after changes stop (debounced)</Text>
        </Box>
      )}
    </Box>
  );
};
