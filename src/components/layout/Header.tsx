/**
 * Header Component
 * Clean status bar with key metrics - no heavy borders
 */

import { Box, Text } from 'ink';
import React from 'react';
import packageJson from '../../../package.json' with { type: 'json' };
import type { NetworkPlan } from '../../core/models/network-plan.js';
import { useTerminalWidth } from '../../hooks/useTerminalWidth.js';
import { colors, symbols } from '../../themes/colors.js';
import { EfficiencyBar } from '../widgets/EfficiencyBar.js';

export interface HeaderProps {
  plan: NetworkPlan;
}

export const Header: React.FC<HeaderProps> = React.memo(({ plan }) => {
  const terminalWidth = useTerminalWidth();

  // Define layout breakpoints
  const isNarrow = terminalWidth < 80;
  const isVeryNarrow = terminalWidth < 60;

  const getPlanStatus = (): React.ReactElement => {
    if (plan.supernet) {
      return (
        <>
          <Text>{colors.success(symbols.success)}</Text>
          <Text> </Text>
          <Text>{colors.success('Calculated')}</Text>
        </>
      );
    }
    if (plan.subnets.length > 0) {
      return (
        <>
          <Text>{colors.warning(symbols.pending)}</Text>
          <Text> </Text>
          <Text>{colors.warning('Draft')}</Text>
        </>
      );
    }
    return (
      <>
        <Text>{colors.empty(symbols.pending)}</Text>
        <Text> </Text>
        <Text>{colors.empty('Empty')}</Text>
      </>
    );
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={0}>
      {/* Title Bar - stack on very narrow screens */}
      {isVeryNarrow ? (
        <Box flexDirection="column">
          <Box>
            <Text bold>{colors.accent('cidrly')}</Text>
            <Text> </Text>
            <Text>{colors.dim(`v${packageJson.version}`)}</Text>
            <Text> </Text>
            <Text>{colors.dim('›')}</Text>
            <Text> </Text>
            <Text>{colors.slate(plan.name)}</Text>
          </Box>
          <Box>{getPlanStatus()}</Box>
        </Box>
      ) : (
        <Box justifyContent="space-between">
          <Box>
            <Text bold>{colors.accent('cidrly')}</Text>
            <Text> </Text>
            <Text>{colors.dim(`v${packageJson.version}`)}</Text>
            <Text> </Text>
            <Text>{colors.dim('›')}</Text>
            <Text> </Text>
            <Text>{colors.slate(plan.name)}</Text>
          </Box>
          <Box>{getPlanStatus()}</Box>
        </Box>
      )}

      {/* Metrics Bar - stack on narrow screens */}
      {plan.subnets.length > 0 && (
        <Box
          flexDirection={isNarrow ? 'column' : 'row'}
          justifyContent={isNarrow ? 'flex-start' : 'space-between'}
          marginTop={0}
        >
          <Box>
            <Text>{colors.muted('Base')}</Text>
            <Text> </Text>
            <Text>{colors.slate(plan.baseIp)}</Text>
            <Text> </Text>
            <Text>{colors.dim('·')}</Text>
            <Text> </Text>
            <Text>{colors.muted('Subnets')}</Text>
            <Text> </Text>
            <Text>{colors.slate(plan.subnets.length.toString())}</Text>
          </Box>
          {plan.supernet && (
            <Box marginTop={isNarrow ? 0 : 0}>
              <Text>{colors.muted('Supernet')}</Text>
              <Text> </Text>
              <Text>{colors.accent(plan.supernet.networkAddress)}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Efficiency Bar - stack on narrow screens and simplify on very narrow */}
      {plan.supernet && (
        <Box
          flexDirection={isNarrow ? 'column' : 'row'}
          justifyContent={isNarrow ? 'flex-start' : 'space-between'}
          marginTop={0}
        >
          <Box>
            <Text>{colors.muted('Efficiency')}</Text>
            <Text> </Text>
            <EfficiencyBar efficiency={plan.supernet.efficiency} />
            <Text> </Text>
            <Text>{colors.dim('•')}</Text>
            <Text> </Text>
            <Text>{colors.muted(`Growth: ${plan.growthPercentage}%`)}</Text>
          </Box>
          <Box marginTop={isNarrow ? 0 : 0}>
            <Text>{colors.muted(plan.supernet.usedSize.toLocaleString())}</Text>
            <Text>{colors.dim(' / ')}</Text>
            <Text>{colors.muted(plan.supernet.totalSize.toLocaleString())}</Text>
            <Text> </Text>
            <Text>{colors.dim('addresses')}</Text>
          </Box>
        </Box>
      )}

      {/* Subtle divider */}
      <Box>
        <Text>{colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}</Text>
      </Box>
    </Box>
  );
});
