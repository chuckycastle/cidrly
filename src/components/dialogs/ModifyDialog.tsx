/**
 * ModifyDialog Component
 * Selection dialog for subnet modification options
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { colors, symbols } from '../../themes/colors.js';

export interface ModifyDialogProps {
  onSelectManualEdit: () => void;
  onSelectAutoFit: () => void;
  onSelectManageBlocks: () => void;
  hasAssignedBlocks: boolean;
  onCancel: () => void;
}

const OPTIONS = [
  {
    value: 'manual',
    label: 'Manual Edit',
    description: 'Edit network addresses for selected subnets',
  },
  {
    value: 'autofit',
    label: 'Auto-Fit',
    description: 'Automatically allocate subnets into available IP blocks',
  },
  {
    value: 'manage-blocks',
    label: 'Manage Blocks',
    description: 'Add, remove, or view assigned IP blocks',
  },
];

export const ModifyDialog: React.FC<ModifyDialogProps> = ({
  onSelectManualEdit,
  onSelectAutoFit,
  onSelectManageBlocks,
  hasAssignedBlocks,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onCancel();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : OPTIONS.length - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev < OPTIONS.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const selected = OPTIONS[selectedIndex];
      if (selected?.value === 'manual') {
        onSelectManualEdit();
      } else if (selected?.value === 'autofit') {
        onSelectAutoFit();
      } else if (selected?.value === 'manage-blocks') {
        onSelectManageBlocks();
      }
    }
  });

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Modify Subnets')}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Options */}
      <Box flexDirection="column" marginBottom={1}>
        {OPTIONS.map((option, index) => {
          const isSelected = index === selectedIndex;
          const showBlockIndicator = option.value === 'manage-blocks' && hasAssignedBlocks;

          return (
            <Box
              key={option.value}
              flexDirection="column"
              marginBottom={index < OPTIONS.length - 1 ? 1 : 0}
            >
              <Box>
                <Text>
                  {isSelected ? colors.accent(symbols.selected) : colors.dim(symbols.unselected)}
                </Text>
                <Text> </Text>
                <Text bold={isSelected}>
                  {isSelected ? colors.accent(option.label) : colors.slate(option.label)}
                </Text>
                {showBlockIndicator && (
                  <>
                    <Text> </Text>
                    <Text>{colors.success('●')}</Text>
                  </>
                )}
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{option.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Help */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('↑↓')}</Text>
        <Text>{colors.dim(' to navigate, ')}</Text>
        <Text>{colors.muted('Enter')}</Text>
        <Text>{colors.dim(' to select, ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to cancel')}</Text>
      </Box>
    </Box>
  );
};
