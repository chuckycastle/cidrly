/**
 * FilePicker Widget
 * Enhanced file selection with metadata display
 */

import { formatDistanceToNow } from 'date-fns';
import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import type { SavedPlanFile } from '../../services/file.service.js';
import { colors, symbols } from '../../themes/colors.js';

export interface FilePickerProps {
  title: string;
  files: SavedPlanFile[];
  onSelect: (filepath: string) => void;
  onCancel: () => void;
  emptyMessage?: string;
}

const MAX_VISIBLE_ITEMS = 8;

/**
 * Format filename for display (remove .json extension)
 */
const formatFilename = (filename: string): string => {
  return filename.replace(/\.json$/, '');
};

/**
 * Truncate filename if too long
 */
const truncateFilename = (filename: string, maxLength: number = 35): string => {
  const formatted = formatFilename(filename);
  if (formatted.length <= maxLength) return formatted;
  return formatted.substring(0, maxLength - 3) + '...';
};

export const FilePicker: React.FC<FilePickerProps> = ({
  title,
  files,
  onSelect,
  onCancel,
  emptyMessage = 'No files found',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const needsScrolling = files.length > MAX_VISIBLE_ITEMS;
  const visibleFiles = needsScrolling
    ? files.slice(scrollOffset, scrollOffset + MAX_VISIBLE_ITEMS)
    : files;
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = needsScrolling && scrollOffset + MAX_VISIBLE_ITEMS < files.length;
  const itemsAbove = scrollOffset;
  const itemsBelow = Math.max(0, files.length - (scrollOffset + MAX_VISIBLE_ITEMS));

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => {
        const newIndex = prev > 0 ? prev - 1 : files.length - 1;

        // Auto-scroll up if needed
        if (needsScrolling && newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        } else if (needsScrolling && newIndex === files.length - 1) {
          // Wrapped to end, scroll to show last items
          setScrollOffset(Math.max(0, files.length - MAX_VISIBLE_ITEMS));
        }

        return newIndex;
      });
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => {
        const newIndex = prev < files.length - 1 ? prev + 1 : 0;

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
      const selectedFile = files[selectedIndex];
      if (selectedFile) {
        onSelect(selectedFile.path);
      }
    }
  });

  // Handle empty state
  if (files.length === 0) {
    return (
      <Box
        borderStyle="double"
        borderColor="yellow"
        paddingX={3}
        paddingY={2}
        flexDirection="column"
      >
        <Box marginBottom={1}>
          <Text bold>{colors.warning(title)}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>{colors.dim('─'.repeat(40))}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>{colors.muted(emptyMessage)}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>{colors.dim('─'.repeat(40))}</Text>
        </Box>

        <Box>
          <Text>{colors.dim('Press ')}</Text>
          <Text>{colors.muted('Esc')}</Text>
          <Text>{colors.dim(' to close')}</Text>
        </Box>
      </Box>
    );
  }

  return (
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
            <Text>{colors.dim(`(${selectedIndex + 1}/${files.length})`)}</Text>
          </>
        )}
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(60))}</Text>
      </Box>

      {/* Scroll indicator - items above */}
      {hasMoreAbove && (
        <Box marginBottom={1}>
          <Text>{colors.muted('↑')}</Text>
          <Text> </Text>
          <Text>{colors.dim(`${itemsAbove} more above`)}</Text>
        </Box>
      )}

      {/* File list */}
      <Box flexDirection="column" marginBottom={1}>
        {visibleFiles.map((file, visibleIndex) => {
          const actualIndex = scrollOffset + visibleIndex;
          const isSelected = actualIndex === selectedIndex;
          const relativeTime = formatDistanceToNow(file.modifiedAt, { addSuffix: true });

          if (isSelected) {
            return (
              <Box key={actualIndex} marginBottom={0}>
                <Box width={40}>
                  <Text>{colors.accent(symbols.selected)}</Text>
                  <Text> </Text>
                  <Text bold>{colors.accent(truncateFilename(file.filename, 35))}</Text>
                </Box>
                <Box>
                  <Text>{colors.dim(relativeTime)}</Text>
                </Box>
              </Box>
            );
          }

          return (
            <Box key={actualIndex} marginBottom={0}>
              <Box width={40}>
                <Text>{colors.dim(symbols.unselected)}</Text>
                <Text> </Text>
                <Text>{colors.slate(truncateFilename(file.filename, 35))}</Text>
              </Box>
              <Box>
                <Text>{colors.dim(relativeTime)}</Text>
              </Box>
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
        <Text>{colors.dim('─'.repeat(60))}</Text>
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
};
