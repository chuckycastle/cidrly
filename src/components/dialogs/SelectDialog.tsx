/**
 * SelectDialog Component
 * Modern selection modal with clean styling and scrolling support
 */

import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { colors, symbols } from '../../themes/colors.js';

export interface SelectDialogProps {
  title: string;
  items: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
  onCancel: () => void;
  overlay?: boolean;
}

const MAX_VISIBLE_ITEMS = 8;

export const SelectDialog: React.FC<SelectDialogProps> = ({
  title,
  items,
  onSelect,
  onCancel,
  overlay = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const needsScrolling = items.length > MAX_VISIBLE_ITEMS;
  const visibleItems = needsScrolling
    ? items.slice(scrollOffset, scrollOffset + MAX_VISIBLE_ITEMS)
    : items;
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = needsScrolling && scrollOffset + MAX_VISIBLE_ITEMS < items.length;
  const itemsAbove = scrollOffset;
  const itemsBelow = Math.max(0, items.length - (scrollOffset + MAX_VISIBLE_ITEMS));

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => {
        const newIndex = prev > 0 ? prev - 1 : items.length - 1;

        // Auto-scroll up if needed
        if (needsScrolling && newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        } else if (needsScrolling && newIndex === items.length - 1) {
          // Wrapped to end, scroll to show last items
          setScrollOffset(Math.max(0, items.length - MAX_VISIBLE_ITEMS));
        }

        return newIndex;
      });
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => {
        const newIndex = prev < items.length - 1 ? prev + 1 : 0;

        // Auto-scroll down if needed
        if (needsScrolling && newIndex >= scrollOffset + MAX_VISIBLE_ITEMS) {
          setScrollOffset(newIndex - MAX_VISIBLE_ITEMS + 1);
        } else if (needsScrolling && newIndex === 0) {
          // Wrapped to beginning, scroll to top
          setScrollOffset(0);
        }

        return newIndex;
      });
    } else if (key.return) {
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        onSelect(selectedItem.value);
      }
    }
  });

  const dialogContent = (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={3}
      paddingY={1}
      flexDirection="column"
      overflow="visible"
    >
      {/* Title with position indicator */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate(title)}</Text>
        {needsScrolling && (
          <>
            <Text> </Text>
            <Text>{colors.dim(`(${selectedIndex + 1}/${items.length})`)}</Text>
          </>
        )}
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Scroll indicator - items above */}
      {hasMoreAbove && (
        <Box marginBottom={1}>
          <Text>{colors.muted('↑')}</Text>
          <Text> </Text>
          <Text>{colors.dim(`${itemsAbove} more above`)}</Text>
        </Box>
      )}

      {/* Selection list */}
      <Box flexDirection="column" marginBottom={1}>
        {visibleItems.map((item, visibleIndex) => {
          const actualIndex = scrollOffset + visibleIndex;
          const isSelected = actualIndex === selectedIndex;

          if (isSelected) {
            return (
              <Box key={actualIndex}>
                <Text>{colors.accent(symbols.selected)}</Text>
                <Text> </Text>
                <Text bold>{colors.accent(item.label)}</Text>
              </Box>
            );
          }

          return (
            <Box key={actualIndex}>
              <Text>{colors.dim(symbols.unselected)}</Text>
              <Text> </Text>
              <Text>{colors.slate(item.label)}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator - items below */}
      {hasMoreBelow && (
        <Box marginBottom={1}>
          <Text>{colors.muted('↓')}</Text>
          <Text> </Text>
          <Text>{colors.dim(`${itemsBelow} more below`)}</Text>
        </Box>
      )}

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>

      {/* Help text */}
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

  if (overlay) {
    return (
      <Box
        position="absolute"
        width="100%"
        height="100%"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
      >
        {dialogContent}
      </Box>
    );
  }

  return dialogContent;
};
