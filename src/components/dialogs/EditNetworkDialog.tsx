/**
 * EditNetworkDialog Component
 * Modal for manually editing subnet network addresses
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import { validateManualNetworkAddress } from '../../core/validators/validators.js';
import type { Subnet } from '../../schemas/network-plan.schema.js';
import { colors } from '../../themes/colors.js';

export interface EditNetworkDialogProps {
  subnet: Subnet;
  baseNetwork: string;
  existingSubnets: Subnet[];
  onSubmit: (networkAddress: string, lock: boolean) => void;
  onCancel: () => void;
}

export const EditNetworkDialog: React.FC<EditNetworkDialogProps> = ({
  subnet,
  baseNetwork,
  existingSubnets,
  onSubmit,
  onCancel,
}) => {
  const currentNetwork = subnet.subnetInfo?.networkAddress || '';
  const currentCidr = subnet.subnetInfo?.cidrPrefix || 24;

  // Extract just the IP address without CIDR for initial value
  const currentIp = currentNetwork.split('/')[0] || '';

  const [ipAddress, setIpAddress] = useState(currentIp);
  const [cidrPrefix, setCidrPrefix] = useState(currentCidr.toString());
  const [lock, setLock] = useState(subnet.networkLocked ?? false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [focusedField, setFocusedField] = useState<'ip' | 'cidr' | 'lock'>('ip');

  // Reset state when subnet changes
  useEffect(() => {
    const network = subnet.subnetInfo?.networkAddress || '';
    const ip = network.split('/')[0] || '';
    setIpAddress(ip);
    setCidrPrefix((subnet.subnetInfo?.cidrPrefix || 24).toString());
    setLock(subnet.networkLocked ?? false);
    setErrors([]);
    setWarnings([]);
    setFocusedField('ip');
  }, [subnet]);

  // Handle keyboard input
  useInput((_input, key) => {
    // Escape or vim 'q' to cancel
    if (key.escape || _input === 'q') {
      onCancel();
      return;
    }

    // Enter key - submit when on lock field
    if (key.return && focusedField === 'lock') {
      handleValidateAndSubmit();
      return;
    }

    // Tab or vim 'j'/'l' (down/right) to cycle forward through fields
    if (key.tab || _input === 'j' || _input === 'l') {
      if (focusedField === 'ip') {
        setFocusedField('cidr');
      } else if (focusedField === 'cidr') {
        setFocusedField('lock');
      } else {
        setFocusedField('ip');
      }
      return;
    }

    // Vim 'h'/'k' (left/up) to cycle backward through fields
    if (_input === 'h' || _input === 'k') {
      if (focusedField === 'ip') {
        setFocusedField('lock');
      } else if (focusedField === 'cidr') {
        setFocusedField('ip');
      } else {
        setFocusedField('cidr');
      }
      return;
    }

    // Toggle lock checkbox with spacebar when focused
    if (focusedField === 'lock' && _input === ' ') {
      setLock(!lock);
      return;
    }
  });

  const handleIpChange = (value: string): void => {
    // Only allow IP address characters: digits and dots
    const filtered = value.replace(/[^0-9.]/g, '');
    setIpAddress(filtered);
    setErrors([]);
    setWarnings([]);
  };

  const handleCidrChange = (value: string): void => {
    // Only allow digits
    const filtered = value.replace(/[^0-9]/g, '');
    setCidrPrefix(filtered);
    setErrors([]);
    setWarnings([]);
  };

  const handleValidateAndSubmit = (): void => {
    // Construct full network address
    const networkAddress = `${ipAddress}/${cidrPrefix}`;
    const expectedCidr = subnet.subnetInfo?.cidrPrefix || 24;

    // Validate using the validator function
    const validation = validateManualNetworkAddress(
      networkAddress,
      expectedCidr,
      baseNetwork,
      existingSubnets,
      subnet.id,
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      setWarnings(validation.warnings);
      return;
    }

    // Show warnings but allow submission
    if (validation.warnings.length > 0) {
      setWarnings(validation.warnings);
    }

    // Valid - submit
    onSubmit(networkAddress, lock);
  };

  const handleSubmit = (): void => {
    if (focusedField === 'ip') {
      // Move to CIDR field
      setFocusedField('cidr');
    } else if (focusedField === 'cidr') {
      // Move to lock field
      setFocusedField('lock');
    } else {
      // Submit from lock field
      handleValidateAndSubmit();
    }
  };

  return (
    <Box borderStyle="double" borderColor="cyan" paddingX={3} paddingY={1} flexDirection="column">
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold>{colors.slate('Edit Network Address')}</Text>
      </Box>

      {/* Subnet Info */}
      <Box marginBottom={1}>
        <Text>{colors.muted(`Subnet: ${subnet.name} (VLAN ${subnet.vlanId})`)}</Text>
      </Box>

      {/* Current network */}
      <Box marginBottom={1}>
        <Text>{colors.dim(`Current: ${currentNetwork || 'Not calculated'}`)}</Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* IP Address Input */}
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text>{colors.muted('Network Address: ')}</Text>
        </Box>
        <Box>
          <Text>{focusedField === 'ip' ? colors.accent('› ') : '  '}</Text>
          {focusedField === 'ip' ? (
            <TextInput
              value={ipAddress}
              onChange={handleIpChange}
              onSubmit={handleSubmit}
              placeholder="10.0.0.0"
            />
          ) : (
            <Text>{ipAddress || colors.dim('(empty)')}</Text>
          )}
        </Box>
      </Box>

      {/* CIDR Prefix Input */}
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text>{colors.muted('CIDR Prefix: ')}</Text>
        </Box>
        <Box>
          <Text>{focusedField === 'cidr' ? colors.accent('› ') : '  '}</Text>
          <Text>/</Text>
          {focusedField === 'cidr' ? (
            <TextInput
              value={cidrPrefix}
              onChange={handleCidrChange}
              onSubmit={handleSubmit}
              placeholder="24"
            />
          ) : (
            <Text>{cidrPrefix}</Text>
          )}
          <Text>{colors.dim(` (calculated: /${currentCidr})`)}</Text>
        </Box>
      </Box>

      {/* Lock Checkbox */}
      <Box marginBottom={1}>
        <Text>{focusedField === 'lock' ? colors.accent('› ') : '  '}</Text>
        <Text>[{lock ? 'x' : ' '}] </Text>
        <Text>{colors.muted('Lock address (prevent auto-recalculation)')}</Text>
      </Box>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          {warnings.map((warning, i) => (
            <Box key={i}>
              <Text>{colors.warning(`⚠ ${warning}`)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          {errors.map((error, i) => (
            <Box key={i}>
              <Text>{colors.error(`✕ ${error}`)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Divider */}
      <Box marginBottom={1}>
        <Text>{colors.dim('─'.repeat(50))}</Text>
      </Box>

      {/* Help text */}
      <Box flexDirection="column">
        <Box>
          <Text>{colors.dim('Press ')}</Text>
          <Text>{colors.muted('Tab')}</Text>
          <Text>{colors.dim(' to switch fields, ')}</Text>
          <Text>{colors.muted('Enter')}</Text>
          <Text>{colors.dim(' to continue, ')}</Text>
          <Text>{colors.muted('Esc')}</Text>
          <Text>{colors.dim(' to cancel')}</Text>
        </Box>
        {focusedField === 'lock' && (
          <Box>
            <Text>{colors.dim('Press ')}</Text>
            <Text>{colors.muted('Space')}</Text>
            <Text>{colors.dim(' to toggle lock, ')}</Text>
            <Text>{colors.muted('Enter')}</Text>
            <Text>{colors.dim(' to save')}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
