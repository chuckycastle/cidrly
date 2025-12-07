/**
 * AvailableSpaceDialog Component
 * Displays unallocated IP space from assigned blocks
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { SpaceAllocationReport } from '../../core/models/network-plan.js';
import { useTerminalHeight } from '../../hooks/useTerminalHeight.js';
import { colors, symbols } from '../../themes/colors.js';
import { EfficiencyBar } from '../widgets/EfficiencyBar.js';

export interface AvailableSpaceDialogProps {
  report: SpaceAllocationReport | undefined;
  onClose: () => void;
}

/**
 * Format a number with comma separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Render a utilization bar using block characters
 */
function renderUtilizationBar(percent: number, width: number = 16): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export const AvailableSpaceDialog: React.FC<AvailableSpaceDialogProps> = ({ report, onClose }) => {
  const terminalHeight = useTerminalHeight();
  const isShort = terminalHeight < 35;
  const isVeryShort = terminalHeight < 25;

  // Handle keyboard input for closing
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  // No assigned blocks state
  if (!report || report.blockSummaries.length === 0) {
    return (
      <Box
        borderStyle="double"
        borderColor="yellow"
        paddingX={3}
        paddingY={isVeryShort ? 1 : 2}
        flexDirection="column"
      >
        <Box marginBottom={isVeryShort ? 0 : 1}>
          <Text>{colors.warning(symbols.warning)}</Text>
          <Text> </Text>
          <Text bold>{colors.warning('No Assigned Blocks')}</Text>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(50))}</Text>
          </Box>
        )}

        <Box marginBottom={isVeryShort ? 0 : 1} flexDirection="column">
          <Text>{colors.muted('Run auto-fit (')}</Text>
          <Box>
            <Text>{colors.muted('  ')}</Text>
            <Text bold>{colors.accent('M')}</Text>
            <Text>{colors.muted(' → ')}</Text>
            <Text bold>{colors.accent('Auto-Fit')}</Text>
            <Text>{colors.muted(')')}</Text>
          </Box>
          <Text>{colors.muted('to assign IP blocks and track available space.')}</Text>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(50))}</Text>
          </Box>
        )}

        <Box>
          <Text>{colors.dim('Press ')}</Text>
          <Text>{colors.muted('Esc')}</Text>
          <Text>{colors.dim(' to close')}</Text>
        </Box>
      </Box>
    );
  }

  // Count blocks with available space
  const blocksWithSpace = report.blockSummaries.filter((s) => s.availableCapacity > 0).length;

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
        <Text bold>{colors.accent('Available IP Space')}</Text>
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(55))}</Text>
        </Box>
      )}

      {/* Summary Section */}
      <Box flexDirection="column" marginBottom={isShort ? 0 : 1}>
        <Text bold>{colors.slate('Summary')}</Text>
        <Box>
          <Text>{colors.muted('Total Available: ')}</Text>
          <Text bold>
            {report.totalAvailableCapacity > 0
              ? colors.success(formatNumber(report.totalAvailableCapacity))
              : colors.warning('0')}
          </Text>
          <Text>{colors.muted(' addresses')}</Text>
          {blocksWithSpace > 0 && (
            <Text>
              {colors.muted(` across ${blocksWithSpace} block${blocksWithSpace > 1 ? 's' : ''}`)}
            </Text>
          )}
        </Box>
        <Box>
          <Text>{colors.muted('Overall Utilization: ')}</Text>
          <EfficiencyBar efficiency={report.overallUtilizationPercent} />
        </Box>
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(55))}</Text>
        </Box>
      )}

      {/* Per-Block Details */}
      <Box flexDirection="column" marginBottom={isShort ? 0 : 1}>
        {report.blockSummaries.map((summary, index) => (
          <Box key={summary.blockId} flexDirection="column" marginBottom={isShort ? 0 : 1}>
            {/* Block header */}
            <Box>
              <Text bold>{colors.accent(`Block ${index + 1}: `)}</Text>
              <Text>{colors.slate(summary.block.networkAddress)}</Text>
              <Text>{colors.dim(` (${formatNumber(summary.block.totalCapacity)} total)`)}</Text>
            </Box>

            {/* Block stats */}
            <Box>
              <Text>{colors.muted('Used: ')}</Text>
              <Text>{colors.slate(formatNumber(summary.usedCapacity))}</Text>
              <Text>{colors.dim(' · ')}</Text>
              <Text>{colors.muted('Available: ')}</Text>
              <Text>
                {summary.availableCapacity > 0
                  ? colors.success(formatNumber(summary.availableCapacity))
                  : colors.warning('0')}
              </Text>
              <Text>{colors.dim(' · ')}</Text>
              <Text>
                {summary.utilizationPercent >= 100
                  ? colors.warning(renderUtilizationBar(summary.utilizationPercent))
                  : summary.utilizationPercent >= 80
                    ? colors.accent(renderUtilizationBar(summary.utilizationPercent))
                    : colors.success(renderUtilizationBar(summary.utilizationPercent))}
              </Text>
              <Text> </Text>
              <Text>{colors.dim(`${summary.utilizationPercent.toFixed(0)}%`)}</Text>
            </Box>

            {/* Available fragments or fully allocated message */}
            {summary.fragments.length > 0 ? (
              <Box flexDirection="column">
                {!isVeryShort && <Text>{colors.muted('Available Ranges:')}</Text>}
                {summary.fragments.slice(0, isShort ? 2 : 5).map((fragment) => (
                  <Box key={fragment.networkAddress}>
                    <Text>{colors.dim('  ')}</Text>
                    <Text>{colors.success(fragment.networkAddress.padEnd(18))}</Text>
                    <Text>{colors.dim(' → ')}</Text>
                    <Text>{colors.slate(formatNumber(fragment.capacity))}</Text>
                    <Text>{colors.dim(' addresses')}</Text>
                  </Box>
                ))}
                {summary.fragments.length > (isShort ? 2 : 5) && (
                  <Box>
                    <Text>{colors.dim('  ')}</Text>
                    <Text>
                      {colors.muted(
                        `... and ${summary.fragments.length - (isShort ? 2 : 5)} more range(s)`,
                      )}
                    </Text>
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                <Text>{colors.dim('  ')}</Text>
                <Text>{colors.warning('(Fully allocated)')}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Divider */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(55))}</Text>
        </Box>
      )}

      {/* Close hint */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to close')}</Text>
      </Box>
    </Box>
  );
};
