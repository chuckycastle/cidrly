/**
 * EfficiencyBar Widget
 * Reusable visual representation of efficiency percentage
 * Used in Header and SubnetInfoDialog
 */

import { Box, Text } from 'ink';
import React from 'react';
import { colors, symbols } from '../../themes/colors.js';

export interface EfficiencyBarProps {
  /**
   * Efficiency percentage (0-100)
   */
  efficiency: number;

  /**
   * Width of the bar in characters
   * @default 20
   */
  width?: number;

  /**
   * Whether to show the percentage text
   * @default true
   */
  showPercentage?: boolean;
}

/**
 * EfficiencyBar Component
 * Displays a colored progress bar based on efficiency thresholds:
 * - >= 75%: High efficiency (green)
 * - >= 50%: Medium efficiency (yellow/amber)
 * - < 50%: Low efficiency (red)
 */
export const EfficiencyBar: React.FC<EfficiencyBarProps> = React.memo(
  ({ efficiency, width = 20, showPercentage = true }) => {
    const filled = Math.round((efficiency / 100) * width);
    const empty = width - filled;
    const color =
      efficiency >= 75
        ? colors.efficiencyHigh
        : efficiency >= 50
          ? colors.efficiencyMedium
          : colors.efficiencyLow;

    return (
      <Box>
        <Text>{color(symbols.bar.repeat(filled))}</Text>
        <Text>{colors.dim(symbols.lightBar.repeat(empty))}</Text>
        {showPercentage && (
          <>
            <Text> </Text>
            <Text>{colors.muted(`${efficiency.toFixed(1)}%`)}</Text>
          </>
        )}
      </Box>
    );
  },
);
