/**
 * SubnetInfoDialog Component
 * Modern ipcalc-style information display
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import { getSubnetDetails } from '../../core/calculators/subnet-calculator.js';
import type { Subnet } from '../../core/models/network-plan.js';
import { useTerminalHeight } from '../../hooks/useTerminalHeight.js';
import { colors, symbols } from '../../themes/colors.js';
import { EfficiencyBar } from '../widgets/EfficiencyBar.js';

export interface SubnetInfoDialogProps {
  subnet: Subnet;
  onClose: () => void;
}

export const SubnetInfoDialog: React.FC<SubnetInfoDialogProps> = ({ subnet, onClose }) => {
  const terminalHeight = useTerminalHeight();

  // Define layout breakpoints for height
  const isShort = terminalHeight < 30;
  const isVeryShort = terminalHeight < 25;

  // Handle keyboard input for closing
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose();
    }
  });

  if (!subnet.subnetInfo) {
    return (
      <Box
        borderStyle="double"
        borderColor="red"
        paddingX={3}
        paddingY={isVeryShort ? 1 : 2}
        flexDirection="column"
      >
        <Box marginBottom={isVeryShort ? 0 : 1}>
          <Text>{colors.error(symbols.error)}</Text>
          <Text> </Text>
          <Text bold>{colors.error('Subnet Not Calculated')}</Text>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(40))}</Text>
          </Box>
        )}

        <Box marginBottom={isVeryShort ? 0 : 1}>
          <Text>{colors.muted('Press ')}</Text>
          <Text bold>{colors.accent('c')}</Text>
          <Text>{colors.muted(' to calculate the network plan.')}</Text>
        </Box>

        {!isVeryShort && (
          <Box marginBottom={1}>
            <Text>{colors.dim('─'.repeat(40))}</Text>
          </Box>
        )}

        <Box>
          <Text>{colors.dim('Press ')}</Text>
          <Text>{colors.muted('Esc')}</Text>
          <Text>{colors.dim(' or ')}</Text>
          <Text>{colors.muted('q')}</Text>
          <Text>{colors.dim(' to close')}</Text>
        </Box>
      </Box>
    );
  }

  const details = getSubnetDetails(subnet.subnetInfo);

  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={3}
      paddingY={isVeryShort ? 0 : 1}
      flexDirection="column"
      overflow="visible"
    >
      {/* Title and Subnet Name combined */}
      <Box marginBottom={isShort ? 0 : 1}>
        <Text bold>{colors.accent(subnet.name)}</Text>
        <Text> </Text>
        <Text>{colors.dim(`(VLAN ${subnet.vlanId})`)}</Text>
      </Box>

      {/* Divider - hide on very short terminals */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(40))}</Text>
        </Box>
      )}

      {/* Address Range - Essential Info */}
      <Box flexDirection="column" marginBottom={isShort ? 0 : 1}>
        <Box minHeight={1}>
          <Text>{colors.muted('Network   ')}</Text>
          <Text>{colors.accent(details.network)}</Text>
        </Box>
        <Box minHeight={1}>
          <Text>{colors.muted('Netmask   ')}</Text>
          <Text>{colors.slate(details.netmask)}</Text>
        </Box>
        {!isShort && (
          <>
            <Box minHeight={1}>
              <Text>{colors.muted('HostMin   ')}</Text>
              <Text>{colors.success(details.hostMin)}</Text>
            </Box>
            <Box minHeight={1}>
              <Text>{colors.muted('HostMax   ')}</Text>
              <Text>{colors.success(details.hostMax)}</Text>
            </Box>
            <Box minHeight={1}>
              <Text>{colors.muted('Broadcast ')}</Text>
              <Text>{colors.warning(details.broadcast)}</Text>
            </Box>
          </>
        )}
      </Box>

      {/* Divider - hide on very short terminals */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(40))}</Text>
        </Box>
      )}

      {/* Capacity Information */}
      <Box flexDirection="column" marginBottom={isShort ? 0 : 1}>
        {!isShort && (
          <Box>
            <Text>{colors.muted('Capacity  ')}</Text>
            <Text bold>{colors.slate(details.hostsNet)}</Text>
          </Box>
        )}
        <Box>
          <Text>{colors.muted('Expected  ')}</Text>
          <Text>{colors.slate(subnet.expectedDevices.toString())}</Text>
          <Text> </Text>
          <Text>{colors.dim('devices')}</Text>
        </Box>
        {!isShort && (
          <Box>
            <Text>{colors.muted('Planned   ')}</Text>
            <Text>{colors.slate(subnet.subnetInfo.plannedDevices.toString())}</Text>
            <Text> </Text>
            <Text>{colors.dim(`(${subnet.expectedDevices} in use)`)}</Text>
          </Box>
        )}
        {!isShort && (
          <Box>
            <Text>{colors.muted('Size      ')}</Text>
            <Text>{colors.slate(subnet.subnetInfo.subnetSize.toString())}</Text>
            <Text> </Text>
            <Text>{colors.dim('addresses')}</Text>
          </Box>
        )}
        <Box>
          <Text>{colors.muted('Efficiency')}</Text>
          <Text> </Text>
          <EfficiencyBar
            efficiency={(subnet.subnetInfo.plannedDevices / subnet.subnetInfo.usableHosts) * 100}
          />
        </Box>
      </Box>

      {/* Divider - hide on very short terminals */}
      {!isVeryShort && (
        <Box marginBottom={isShort ? 0 : 1}>
          <Text>{colors.dim('─'.repeat(40))}</Text>
        </Box>
      )}

      {/* Close hint */}
      <Box>
        <Text>{colors.dim('Press ')}</Text>
        <Text>{colors.muted('Esc')}</Text>
        <Text>{colors.dim(' or ')}</Text>
        <Text>{colors.muted('q')}</Text>
        <Text>{colors.dim(' to close')}</Text>
      </Box>
    </Box>
  );
};
