/**
 * Add Command
 * Adds a subnet to an existing network plan
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { z as zod } from 'zod';
import { addSubnet } from '../core/models/network-plan.js';
import { validateSubnetName, validateVlanId } from '../core/validators/validators.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  name: zod.string().describe('Subnet name'),
  vlan: zod.number().int().min(1).max(4094).describe('VLAN ID (1-4094)'),
  devices: zod.number().int().min(1).describe('Expected number of devices'),
  plan: zod.string().optional().describe('Plan file to load (e.g., my-plan.json)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Add({ options }: Props): React.ReactElement {
  const [status, setStatus] = React.useState<'loading' | 'adding' | 'saving' | 'done' | 'error'>(
    'loading',
  );
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [subnetId, setSubnetId] = React.useState<string>('');

  React.useEffect(() => {
    async function addSubnetToPlan(): Promise<void> {
      try {
        // Validate inputs
        if (!validateSubnetName(options.name)) {
          throw new Error(`Invalid subnet name: ${options.name}`);
        }
        if (!validateVlanId(options.vlan.toString())) {
          throw new Error(`VLAN ID must be between 1 and 4094`);
        }

        // Load plan
        setStatus('loading');
        const fileService = new FileService(FILE_RULES.SAVED_PLANS_DIR);
        const repository = new FileSystemRepository(fileService);

        if (!options.plan) {
          throw new Error('Plan file is required. Use --plan=<filename.json>');
        }

        const plan = await repository.load(options.plan);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
        if (!plan) {
          throw new Error(`Plan not found: ${options.plan}`);
        }

        // Add subnet
        setStatus('adding');
        const updatedPlan = addSubnet(plan, {
          name: options.name,
          vlan: options.vlan,
          expectedDevices: options.devices,
        });

        // Find the newly added subnet ID
        const newSubnet = updatedPlan.subnets.find(
          (s) => s.name === options.name && s.vlanId === options.vlan,
        );
        if (newSubnet) {
          setSubnetId(newSubnet.id);
        }

        // Save updated plan
        setStatus('saving');
        const savedPath = await repository.save(updatedPlan, options.plan);
        setFilepath(savedPath);

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void addSubnetToPlan();
  }, []);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Loading plan "{options.plan}"...
        </Text>
      </Box>
    );
  }

  if (status === 'adding') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Adding subnet "{options.name}"...
        </Text>
      </Box>
    );
  }

  if (status === 'saving') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Saving plan to file...
        </Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">✗ ERROR: {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="green" padding={1} marginBottom={1}>
        <Text color="green">✓ SUCCESS</Text>
      </Box>
      <Text>
        Subnet <Text bold>"{options.name}"</Text> added successfully!
      </Text>
      <Text>
        VLAN: <Text color="cyan">{options.vlan}</Text>
      </Text>
      <Text>
        Devices: <Text color="cyan">{options.devices}</Text>
      </Text>
      {subnetId && (
        <Text>
          Subnet ID: <Text color="cyan">{subnetId}</Text>
        </Text>
      )}
      <Box marginTop={1}>
        <Text>
          Saved to: <Text color="cyan">{filepath}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Use <Text bold>cidrly calculate --plan={options.plan}</Text> to allocate IP ranges.
        </Text>
      </Box>
    </Box>
  );
}
