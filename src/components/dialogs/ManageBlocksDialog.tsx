/**
 * ManageBlocksDialog Component
 * Dialog for viewing, adding, and removing assigned IP blocks
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import type { AssignedBlock } from '../../core/models/network-plan.js';
import { useTerminalHeight } from '../../hooks/useTerminalHeight.js';
import { colors, symbols } from '../../themes/colors.js';

export interface ManageBlocksDialogProps {
  blocks: AssignedBlock[];
  onAddBlock: () => void;
  onRemoveBlock: (blockId: string) => void;
  onClose: () => void;
}

/**
 * Format a number with comma separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

type Mode = 'view' | 'select-remove';

export const ManageBlocksDialog: React.FC<ManageBlocksDialogProps> = ({
  blocks,
  onAddBlock,
  onRemoveBlock,
  onClose,
}) => {
  const terminalHeight = useTerminalHeight();
  const isShort = terminalHeight < 30;
  const isVeryShort = terminalHeight < 25;

  const [mode, setMode] = useState<Mode>('view');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (mode === 'select-remove') {
        setMode('view');
        setSelectedIndex(0);
      } else {
        onClose();
      }
    } else if (mode === 'view') {
      // View mode shortcuts
      if (input === 'a') {
        onAddBlock();
      } else if (input === 'r' && blocks.length > 0) {
        setMode('select-remove');
        setSelectedIndex(0);
      }
    } else if (mode === 'select-remove') {
      // Selection mode for removal
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : blocks.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => (prev < blocks.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        const block = blocks[selectedIndex];
        if (block) {
          onRemoveBlock(block.id);
          setMode('view');
          setSelectedIndex(0);
        }
      }
    }
  });

  // No blocks state
  if (blocks.length === 0 && mode === 'view') {
    return (
      <Box
        borderStyle="double"
        borderColor="yellow"
        paddingX={3}
        paddingY={isVeryShort ? 1 : 2}
        flexDirection="column"
      >
        <Box marginBottom={isVeryShort ? 0 : 1}>
          <Text bold>{colors.accent('Manage IP Blocks')}</Text>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(45))}</Text>
          </Box>
        )}

        <Box marginBottom={isVeryShort ? 0 : 1} flexDirection="column">
          <Text>
            {colors.warning(symbols.warning)} {colors.warning('No assigned blocks')}
          </Text>
          <Box marginTop={1}>
            <Text>{colors.muted('Press ')}</Text>
            <Text bold>{colors.accent('a')}</Text>
            <Text>{colors.muted(' to add blocks, or run ')}</Text>
            <Text bold>{colors.accent('Auto-Fit')}</Text>
          </Box>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(45))}</Text>
          </Box>
        )}

        <Box flexDirection="column">
          <Box>
            <Text bold>{colors.accent('a')}</Text>
            <Text>{colors.muted('dd block')}</Text>
            <Text>{colors.dim(' · ')}</Text>
            <Text>{colors.muted('Esc')}</Text>
            <Text>{colors.dim(' close')}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={3}
      paddingY={isVeryShort ? 0 : 1}
      flexDirection="column"
      overflow="visible"
    >
      {/* Title */}
      <Box marginBottom={isShort ? 0 : 1}>
        <Text bold>{colors.accent('Manage IP Blocks')}</Text>
        {mode === 'select-remove' && (
          <>
            <Text>{colors.dim(' - ')}</Text>
            <Text>{colors.warning('Select block to remove')}</Text>
          </>
        )}
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(50))}</Text>
        </Box>
      )}

      {/* Summary */}
      <Box marginBottom={isShort ? 0 : 1}>
        <Text>{colors.muted('Assigned Blocks: ')}</Text>
        <Text bold>{colors.slate(blocks.length.toString())}</Text>
        <Text>{colors.dim(' · ')}</Text>
        <Text>{colors.muted('Total Capacity: ')}</Text>
        <Text bold>
          {colors.slate(formatNumber(blocks.reduce((sum, b) => sum + b.totalCapacity, 0)))}
        </Text>
        <Text>{colors.dim(' addresses')}</Text>
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(50))}</Text>
        </Box>
      )}

      {/* Block List */}
      <Box flexDirection="column" marginBottom={isShort ? 0 : 1}>
        {blocks.slice(0, isShort ? 5 : 10).map((block, index) => {
          const isSelected = mode === 'select-remove' && index === selectedIndex;

          return (
            <Box key={block.id} marginBottom={0}>
              {mode === 'select-remove' ? (
                <Text>
                  {isSelected ? colors.warning(symbols.selected) : colors.dim(symbols.unselected)}
                </Text>
              ) : (
                <Text>{colors.dim('•')}</Text>
              )}
              <Text> </Text>
              <Text bold={isSelected}>
                {isSelected
                  ? colors.warning(block.networkAddress.padEnd(20))
                  : colors.slate(block.networkAddress.padEnd(20))}
              </Text>
              <Text>{colors.dim(' → ')}</Text>
              <Text>{colors.muted(formatNumber(block.totalCapacity))}</Text>
              <Text>{colors.dim(' addresses')}</Text>
              {block.label && (
                <>
                  <Text>{colors.dim(' · ')}</Text>
                  <Text>{colors.muted(block.label)}</Text>
                </>
              )}
            </Box>
          );
        })}
        {blocks.length > (isShort ? 5 : 10) && (
          <Box>
            <Text>{colors.dim('  ')}</Text>
            <Text>{colors.muted(`... and ${blocks.length - (isShort ? 5 : 10)} more`)}</Text>
          </Box>
        )}
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(50))}</Text>
        </Box>
      )}

      {/* Help */}
      <Box flexDirection="column">
        {mode === 'view' ? (
          <Box>
            <Text bold>{colors.accent('a')}</Text>
            <Text>{colors.muted('dd')}</Text>
            <Text>{colors.dim(' · ')}</Text>
            <Text bold>{colors.accent('r')}</Text>
            <Text>{colors.muted('emove')}</Text>
            <Text>{colors.dim(' · ')}</Text>
            <Text>{colors.muted('Esc')}</Text>
            <Text>{colors.dim(' close')}</Text>
          </Box>
        ) : (
          <Box>
            <Text>{colors.dim('Press ')}</Text>
            <Text>{colors.muted('↑↓')}</Text>
            <Text>{colors.dim(' to navigate, ')}</Text>
            <Text>{colors.muted('Enter')}</Text>
            <Text>{colors.dim(' to remove, ')}</Text>
            <Text>{colors.muted('Esc')}</Text>
            <Text>{colors.dim(' to cancel')}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
