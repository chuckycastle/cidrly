/**
 * AvailableBlocksDialog Component
 * Input for available IP blocks in CIDR notation
 * Collects blocks one at a time with "Add another" option
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import { colors } from '../../themes/colors.js';
import type { AvailableBlock } from '../../utils/block-parser.js';
import {
  calculateTotalCapacity,
  formatCapacity,
  parseAvailableBlocks,
} from '../../utils/block-parser.js';

export interface AvailableBlocksDialogProps {
  onSubmit: (blocks: AvailableBlock[]) => void;
  onCancel: () => void;
}

type DialogMode = 'input' | 'confirm';

export const AvailableBlocksDialog: React.FC<AvailableBlocksDialogProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [mode, setMode] = useState<DialogMode>('input');
  const [currentInput, setCurrentInput] = useState('');
  const [collectedBlocks, setCollectedBlocks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddBlock = (): void => {
    const trimmed = currentInput.trim();

    if (!trimmed) {
      setError('Please enter a CIDR block (e.g., "192.0.2.0/24")');
      return;
    }

    // Validate single block
    const result = parseAvailableBlocks(trimmed);

    if (!result.valid) {
      setError(result.errors[0] || 'Invalid CIDR block');
      return;
    }

    // Add to collected blocks
    setCollectedBlocks([...collectedBlocks, trimmed]);
    setCurrentInput('');
    setError(null);
    setMode('confirm');
  };

  const handleConfirmAddAnother = (addAnother: boolean): void => {
    if (addAnother) {
      setMode('input');
    } else {
      // Parse all collected blocks and submit
      const allBlocksStr = collectedBlocks.join('\n');
      const result = parseAvailableBlocks(allBlocksStr);

      if (!result.valid) {
        setError(result.errors[0] || 'Invalid blocks');
        setMode('input');
        return;
      }

      onSubmit(result.blocks);
    }
  };

  // Handle keyboard input for confirm mode
  useInput(
    (input, key) => {
      if (mode === 'confirm') {
        if (input === 'y') {
          handleConfirmAddAnother(true);
        } else if (input === 'n') {
          handleConfirmAddAnother(false);
        } else if (key.escape || input === 'q') {
          onCancel();
        }
      } else {
        // Input mode
        if (key.escape || input === 'q') {
          onCancel();
        } else if (key.return && currentInput.trim()) {
          handleAddBlock();
        }
      }
    },
    { isActive: true },
  );

  // Calculate total capacity of collected blocks
  const totalCapacity =
    collectedBlocks.length > 0
      ? calculateTotalCapacity(parseAvailableBlocks(collectedBlocks.join('\n')).blocks)
      : 0;

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Available IP Blocks')}</Text>
      </Box>

      {/* Mode: Input */}
      {mode === 'input' && (
        <>
          {/* Instructions */}
          <Box marginBottom={1} flexDirection="column">
            <Text dimColor>Enter an available IP block in CIDR notation:</Text>
            <Text dimColor>Example: 192.0.2.0/24</Text>
          </Box>

          {/* Show collected blocks */}
          {collectedBlocks.length > 0 && (
            <Box marginBottom={1} flexDirection="column">
              <Text bold>{colors.success(`✓ ${collectedBlocks.length} block(s) added:`)}</Text>
              {collectedBlocks.map((block, index) => (
                <Text key={index} dimColor>
                  {index + 1}. {block}
                </Text>
              ))}
              <Text dimColor>Total capacity: {formatCapacity(totalCapacity)} IP addresses</Text>
            </Box>
          )}

          {/* Input */}
          <Box marginBottom={1} flexDirection="column">
            <Text>Block:</Text>
            <TextInput
              value={currentInput}
              onChange={setCurrentInput}
              placeholder="192.0.2.0/24"
              onSubmit={handleAddBlock}
            />
          </Box>

          {/* Error */}
          {error && (
            <Box marginBottom={1}>
              <Text>{colors.error(`✗ ${error}`)}</Text>
            </Box>
          )}

          {/* Help */}
          <Box>
            <Text dimColor>Enter to add block · Esc to cancel</Text>
          </Box>
        </>
      )}

      {/* Mode: Confirm */}
      {mode === 'confirm' && (
        <>
          <Box marginBottom={1}>
            <Text>{colors.success('✓ Block added successfully!')}</Text>
          </Box>

          {/* Show all blocks */}
          <Box marginBottom={1} flexDirection="column">
            <Text bold>Collected blocks ({collectedBlocks.length}):</Text>
            {collectedBlocks.map((block, index) => (
              <Text key={index} dimColor>
                {index + 1}. {block}
              </Text>
            ))}
            <Text dimColor>Total capacity: {formatCapacity(totalCapacity)} IP addresses</Text>
          </Box>

          {/* Confirmation */}
          <Box marginBottom={1}>
            <Text>Add another block?</Text>
          </Box>

          {/* Help */}
          <Box>
            <Text dimColor>y = Yes (add more) · n = No (continue) · Esc to cancel</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
