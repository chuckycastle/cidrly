/**
 * AutoFitPreviewDialog Component
 * Preview auto-fit allocation results with block utilization
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { AutoFitResult, BlockUtilization } from '../../core/calculators/auto-fit.js';
import { colors } from '../../themes/colors.js';
import { formatCapacity } from '../../utils/block-parser.js';

export interface AutoFitPreviewDialogProps {
  result: AutoFitResult;
  onAccept: () => void;
  onCancel: () => void;
}

export const AutoFitPreviewDialog: React.FC<AutoFitPreviewDialogProps> = ({
  result,
  onAccept,
  onCancel,
}) => {
  useInput((input, key) => {
    if (key.return) {
      onAccept();
    } else if (key.escape || input === 'q') {
      onCancel();
    }
  });

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Auto-Fit Preview')}</Text>
      </Box>

      {/* Success/Failure Status */}
      <Box marginBottom={1}>
        {result.success ? (
          <Text>{colors.success('✓ All subnets allocated successfully!')}</Text>
        ) : (
          <Text>
            {colors.error(`✗ Failed to allocate ${result.unallocatedSubnets.length} subnet(s)`)}
          </Text>
        )}
      </Box>

      {/* Errors */}
      {result.errors.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold>{colors.error('Errors:')}</Text>
          {result.errors.map((error, index) => (
            <Text key={index}>{colors.error(`  • ${error}`)}</Text>
          ))}
        </Box>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text bold>{colors.warning('Warnings:')}</Text>
          {result.warnings.map((warning, index) => (
            <Text key={index}>{colors.warning(`  • ${warning}`)}</Text>
          ))}
        </Box>
      )}

      {/* Block Utilizations */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Block Utilization:</Text>
        {result.blockUtilizations.map((util: BlockUtilization) => (
          <Box key={util.blockIndex} marginTop={1} flexDirection="column">
            <Text>
              {colors.accent(`Block ${util.blockIndex + 1}: ${util.block.networkAddress}`)}
            </Text>
            <Text dimColor>
              Used: {formatCapacity(util.usedCapacity)} / {formatCapacity(util.block.totalCapacity)}{' '}
              IPs ({util.utilizationPercent.toFixed(1)}%)
            </Text>
            {util.allocatedSubnets.length > 0 && (
              <Box marginLeft={2} flexDirection="column">
                <Text dimColor>Allocated subnets:</Text>
                {util.allocatedSubnets.map((allocation) => (
                  <Text key={allocation.subnetIndex} dimColor>
                    - Subnet {allocation.subnetIndex + 1}: {allocation.networkAddress}
                  </Text>
                ))}
              </Box>
            )}
            {util.allocatedSubnets.length === 0 && <Text dimColor> (No subnets allocated)</Text>}
          </Box>
        ))}
      </Box>

      {/* Summary */}
      <Box marginBottom={1}>
        <Text dimColor>
          {result.allocations.length} subnet(s) allocated across{' '}
          {result.blockUtilizations.filter((u) => u.allocatedSubnets.length > 0).length} block(s)
        </Text>
      </Box>

      {/* Actions */}
      {result.success && (
        <Box marginBottom={1}>
          <Text>{colors.success('Press Enter to apply allocation and lock subnets')}</Text>
        </Box>
      )}

      {/* Help */}
      <Box>
        <Text dimColor>{result.success ? 'Enter to accept · Esc to cancel' : 'Esc to cancel'}</Text>
      </Box>
    </Box>
  );
};
