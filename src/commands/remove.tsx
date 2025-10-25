/**
 * Remove Command
 * Removes a subnet from an existing network plan
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React from 'react';
import { z as zod } from 'zod';
import { removeSubnet } from '../core/models/network-plan.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  id: zod.string().optional().describe('Subnet ID to remove'),
  name: zod.string().optional().describe('Subnet name to remove (alternative to ID)'),
  plan: zod.string().describe('Plan file to modify (e.g., my-plan.json)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Remove({ options }: Props) {
  const [status, setStatus] = React.useState<'loading' | 'removing' | 'saving' | 'done' | 'error'>(
    'loading',
  );
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [removedName, setRemovedName] = React.useState<string>('');

  React.useEffect(() => {
    async function removeSubnetFromPlan() {
      try {
        if (!options.id && !options.name) {
          throw new Error('Either --id or --name must be specified');
        }

        // Load plan
        setStatus('loading');
        const fileService = new FileService(
          path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR),
        );
        const repository = new FileSystemRepository(fileService);

        const plan = await repository.load(options.plan);
        if (!plan) {
          throw new Error(`Plan not found: ${options.plan}`);
        }

        // Find subnet to remove
        let subnetToRemove;
        if (options.id) {
          subnetToRemove = plan.subnets.find((s) => s.id === options.id);
          if (!subnetToRemove) {
            throw new Error(`Subnet with ID "${options.id}" not found`);
          }
        } else if (options.name) {
          subnetToRemove = plan.subnets.find((s) => s.name === options.name);
          if (!subnetToRemove) {
            throw new Error(`Subnet with name "${options.name}" not found`);
          }
        }

        if (!subnetToRemove) {
          throw new Error('Subnet not found');
        }

        setRemovedName(subnetToRemove.name);

        // Remove subnet
        setStatus('removing');
        const updatedPlan = removeSubnet(plan, subnetToRemove.id);

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

    void removeSubnetFromPlan();
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

  if (status === 'removing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Removing subnet "{removedName}"...
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
        Subnet <Text bold>"{removedName}"</Text> removed successfully!
      </Text>
      <Box marginTop={1}>
        <Text>
          Saved to: <Text color="cyan">{filepath}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Use <Text bold>cidrly view --plan={options.plan}</Text> to see the updated plan.
        </Text>
      </Box>
    </Box>
  );
}
