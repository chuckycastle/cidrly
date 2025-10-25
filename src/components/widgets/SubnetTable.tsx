/**
 * SubnetTable Component
 * Modern data grid with clean styling and subtle selection
 */

import { Box, Text } from 'ink';
import React from 'react';
import type { Subnet } from '../../core/models/network-plan.js';
import { useTerminalWidth } from '../../hooks/useTerminalWidth.js';
import { colors, symbols } from '../../themes/colors.js';

export interface SubnetTableProps {
  subnets: Subnet[];
  selectedIndex: number;
}

export const SubnetTable: React.FC<SubnetTableProps> = React.memo(({ subnets, selectedIndex }) => {
  const terminalWidth = useTerminalWidth();

  if (subnets.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={3} flexGrow={1}>
        <Box marginBottom={2}>
          <Text bold>{colors.slate('Subnets')}</Text>
        </Box>
        <Box>
          <Text>{colors.muted('No subnets defined yet.')}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>{colors.dim('Press ')}</Text>
          <Text bold>{colors.accent('a')}</Text>
          <Text>{colors.dim(' to add your first subnet')}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={0} flexGrow={1}>
      {/* Table Header */}
      <Box marginBottom={0}>
        <Text bold>{colors.slate('Subnets')}</Text>
        <Text> </Text>
        <Text>{colors.dim(`(${subnets.length})`)}</Text>
      </Box>

      {/* Column Headers - subtle, not bold cyan */}
      <Box marginBottom={0}>
        <Text> </Text>
        <Text>{colors.muted('#'.padEnd(2))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('Name'.padEnd(20))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('VLAN'.padStart(6))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('Exp'.padStart(5))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('Plan'.padStart(6))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('CIDR'.padStart(6))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('Hosts'.padStart(7))}</Text>
        <Text> {colors.dim(symbols.divider)} </Text>
        <Text>{colors.muted('Network')}</Text>
      </Box>

      {/* Subtle divider */}
      <Box marginBottom={0}>
        <Text>{colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}</Text>
      </Box>

      {/* Data Rows */}
      <Box flexDirection="column">
        {/* Minimum 12 rows to ensure consistent height for dialogs */}
        {subnets.map((subnet, index) => {
          const isSelected = index === selectedIndex;
          const rowNumber = (index + 1).toString().padStart(2);
          const name = subnet.name.substring(0, 20).padEnd(20);
          const vlan = subnet.vlanId.toString().padStart(6);
          const exp = subnet.expectedDevices.toString().padStart(5);
          const plan = subnet.subnetInfo
            ? subnet.subnetInfo.plannedDevices.toString().padStart(6)
            : '--'.padStart(6);
          const cidr = subnet.subnetInfo
            ? `/${subnet.subnetInfo.cidrPrefix}`.padStart(6)
            : 'N/A'.padStart(6);
          const hosts = subnet.subnetInfo
            ? subnet.subnetInfo.usableHosts.toString().padStart(7)
            : '--'.padStart(7);
          const network = subnet.subnetInfo?.networkAddress || 'Not calculated';

          if (isSelected) {
            return (
              <Box key={index} marginBottom={0}>
                <Text>{colors.highlight(symbols.selected)}</Text>
                <Text> </Text>
                <Text>{colors.accent(rowNumber)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(name)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(vlan)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(exp)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(plan)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(cidr)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(hosts)}</Text>
                <Text> {colors.dim(symbols.divider)} </Text>
                <Text>{colors.accent(network)}</Text>
              </Box>
            );
          }

          return (
            <Box key={index} marginBottom={0}>
              <Text>{colors.dim(symbols.unselected)}</Text>
              <Text> </Text>
              <Text>{colors.dim(rowNumber)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{colors.slate(name)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{colors.muted(vlan)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{colors.muted(exp)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{subnet.subnetInfo ? colors.slate(plan) : colors.dim(plan)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{subnet.subnetInfo ? colors.muted(cidr) : colors.dim(cidr)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{subnet.subnetInfo ? colors.slate(hosts) : colors.dim(hosts)}</Text>
              <Text> {colors.dim(symbols.divider)} </Text>
              <Text>{subnet.subnetInfo ? colors.slate(network) : colors.dim(network)}</Text>
            </Box>
          );
        })}

        {/* Add empty placeholder rows to ensure minimum 12 rows */}
        {Array.from({ length: Math.max(0, 12 - subnets.length) }).map((_, index) => (
          <Box key={`empty-${index}`} minHeight={1}>
            <Text> </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
});
