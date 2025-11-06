/**
 * ColumnConfigDialog Component
 * Configure which columns are visible in the subnet table
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { colors, symbols } from '../../themes/colors.js';

export interface ColumnConfigDialogProps {
  visibleColumns: string[];
  columnOrder: string[];
  onSave: (visibleColumns: string[], columnOrder: string[]) => void;
  onCancel: () => void;
}

type ColumnOption = {
  key: string;
  label: string;
  locked?: boolean; // Cannot be hidden
};

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'vlan', label: 'VLAN' },
  { key: 'expected', label: 'Expected Devices' },
  { key: 'planned', label: 'Planned Devices' },
  { key: 'cidr', label: 'CIDR Prefix' },
  { key: 'usable', label: 'Usable Hosts' },
  { key: 'network', label: 'Network Address' },
  { key: 'description', label: 'Description' },
];

export const ColumnConfigDialog: React.FC<ColumnConfigDialogProps> = ({
  visibleColumns,
  columnOrder: initialColumnOrder,
  onSave,
  onCancel,
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumnOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onCancel();
      return;
    }

    if (key.return) {
      // Ensure name is always visible
      const finalColumns = selectedColumns.includes('name')
        ? selectedColumns
        : ['name', ...selectedColumns];
      onSave(finalColumns, columnOrder);
      return;
    }

    // Vim navigation: j/k or arrow keys for up/down
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(columnOrder.length - 1, prev + 1));
      return;
    }

    // Left/right (h/l) for reordering
    if (key.leftArrow || input === 'h') {
      if (selectedIndex > 0) {
        const column = columnOrder[selectedIndex];
        if (!column || column === 'name') return; // Cannot move locked column
        const prevColumn = columnOrder[selectedIndex - 1];
        if (!prevColumn) return;
        const newOrder = [...columnOrder];
        newOrder[selectedIndex - 1] = column;
        newOrder[selectedIndex] = prevColumn;
        setColumnOrder(newOrder);
        setSelectedIndex(selectedIndex - 1);
      }
      return;
    }

    if (key.rightArrow || input === 'l') {
      if (selectedIndex < columnOrder.length - 1) {
        const column = columnOrder[selectedIndex];
        if (!column || column === 'name') return; // Cannot move locked column
        const nextColumn = columnOrder[selectedIndex + 1];
        if (!nextColumn) return;
        const newOrder = [...columnOrder];
        newOrder[selectedIndex] = nextColumn;
        newOrder[selectedIndex + 1] = column;
        setColumnOrder(newOrder);
        setSelectedIndex(selectedIndex + 1);
      }
      return;
    }

    if (input === ' ') {
      const columnKey = columnOrder[selectedIndex];
      const column = COLUMN_OPTIONS.find((c) => c.key === columnKey);
      if (!column || column.locked) return; // Cannot toggle locked columns

      setSelectedColumns((prev) => {
        if (prev.includes(column.key)) {
          return prev.filter((c) => c !== column.key);
        }
        return [...prev, column.key];
      });
    }
  });

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.accent('Configure Columns')}</Text>
      </Box>

      {/* Instructions */}
      <Box marginBottom={1}>
        <Text>
          {colors.muted('Use arrows to navigate/reorder, Space to toggle, Enter to save')}
        </Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Column list */}
      <Box flexDirection="column" marginBottom={1}>
        {columnOrder.map((columnKey, index) => {
          const column = COLUMN_OPTIONS.find((c) => c.key === columnKey);
          if (!column) return null;

          const isSelected = index === selectedIndex;
          const isVisible = selectedColumns.includes(column.key);
          const checkbox = isVisible ? symbols.success : symbols.pending;
          const lockIcon = column.locked ? ' 🔒' : '';

          return (
            <Box key={column.key} minHeight={1}>
              {isSelected ? (
                <Text>{colors.highlight(symbols.selected)} </Text>
              ) : (
                <Text>{colors.dim(symbols.unselected)} </Text>
              )}
              <Text>
                {isSelected ? colors.accent(checkbox) : colors.muted(checkbox)}
                {'  '}
                {isSelected ? colors.accent(column.label) : colors.slate(column.label)}
                {column.locked && colors.dim(lockIcon)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Footer */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text bold>{colors.accent('Enter')}</Text>
        <Text>{colors.dim(' to save or ')}</Text>
        <Text bold>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to cancel')}</Text>
      </Box>
    </Box>
  );
};
