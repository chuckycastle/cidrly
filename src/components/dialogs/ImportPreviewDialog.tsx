/**
 * ImportPreviewDialog Component
 * Shows preview of parsed import data before confirming
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { NetworkPlan } from '../../core/models/network-plan.js';
import { colors } from '../../themes/colors.js';

export interface ImportPreviewDialogProps {
  plan: NetworkPlan;
  importedCount: number;
  skippedCount: number;
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreviewDialog: React.FC<ImportPreviewDialogProps> = ({
  plan,
  importedCount,
  skippedCount,
  warnings,
  onConfirm,
  onCancel,
}) => {
  useInput((input, key) => {
    if (key.return) {
      onConfirm();
    } else if (key.escape || input === 'q') {
      onCancel();
    }
  });

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Import Preview')}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>
      <Box marginBottom={1} flexDirection="column">
        <Text>
          {colors.muted('Plan: ')}
          {colors.accent(plan.name)}
        </Text>
        <Text>
          {colors.muted('Base IP: ')}
          {colors.slate(plan.baseIp)}
        </Text>
        <Text>
          {colors.muted('Subnets: ')}
          {colors.success(String(importedCount))}
          {skippedCount > 0 && (
            <Text>
              {colors.dim(' (')}
              {colors.warning(String(skippedCount))}
              {colors.dim(' skipped)')}
            </Text>
          )}
        </Text>
      </Box>
      {warnings.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text>{colors.warning('Warnings:')}</Text>
          {warnings.slice(0, 3).map((warning, i) => (
            <Text key={i}>{colors.dim(`  • ${warning}`)}</Text>
          ))}
          {warnings.length > 3 && (
            <Text>{colors.dim(`  ... and ${warnings.length - 3} more`)}</Text>
          )}
        </Box>
      )}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(40))}</Text>
      </Box>
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('Enter')}</Text>
        <Text>{colors.dim(' to import, ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' to cancel')}</Text>
      </Box>
    </Box>
  );
};
