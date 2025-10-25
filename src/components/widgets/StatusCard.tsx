/**
 * StatusCard Widget
 * Displays a status card with icon, label, and value
 */

import { Box, Text } from 'ink';
import React from 'react';

export interface StatusCardProps {
  label: string;
  value: string;
  icon?: string;
  color?: 'green' | 'yellow' | 'red' | 'cyan' | 'blue' | 'gray';
  dimmed?: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = React.memo(
  ({ label, value, icon = '●', color = 'cyan', dimmed = false }) => {
    return (
      <Box borderStyle="round" borderColor={color} padding={1} flexDirection="column">
        <Box>
          <Text color={color} bold>
            {icon} {label}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor={dimmed}>{value}</Text>
        </Box>
      </Box>
    );
  },
);
