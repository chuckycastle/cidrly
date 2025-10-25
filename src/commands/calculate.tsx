/**
 * Calculate Command
 * Calculates and allocates IP ranges for all subnets in a network plan
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React from 'react';
import { z as zod } from 'zod';
import type { NetworkPlan } from '../core/models/network-plan.js';
import { calculateSubnetRanges } from '../core/models/network-plan.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  plan: zod.string().describe('Plan file to calculate (e.g., my-plan.json)'),
  save: zod.boolean().default(true).describe('Save calculated plan to file (default: true)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Calculate({ options }: Props) {
  const [status, setStatus] = React.useState<
    'loading' | 'calculating' | 'saving' | 'done' | 'error'
  >('loading');
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [totalSubnets, setTotalSubnets] = React.useState<number>(0);
  const [calculatedCount, setCalculatedCount] = React.useState<number>(0);

  React.useEffect(() => {
    async function calculatePlan() {
      try {
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

        setTotalSubnets(plan.subnets.length);

        if (plan.subnets.length === 0) {
          throw new Error('Plan has no subnets. Add subnets first using: cidrly add');
        }

        // Calculate subnet ranges
        setStatus('calculating');
        const calculatedPlan = calculateSubnetRanges(plan);

        // Count how many subnets were successfully calculated
        const calculated = calculatedPlan.subnets.filter(
          (s: NetworkPlan['subnets'][number]) => s.subnetInfo?.networkAddress,
        ).length;
        setCalculatedCount(calculated);

        // Save if requested
        if (options.save) {
          setStatus('saving');
          const savedPath = await repository.save(calculatedPlan, options.plan);
          setFilepath(savedPath);
        }

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void calculatePlan();
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

  if (status === 'calculating') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Calculating IP ranges for {totalSubnets} subnet
          {totalSubnets !== 1 ? 's' : ''}...
        </Text>
      </Box>
    );
  }

  if (status === 'saving') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Saving calculated plan...
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
        IP ranges calculated for{' '}
        <Text bold>
          {calculatedCount}/{totalSubnets}
        </Text>{' '}
        subnet{totalSubnets !== 1 ? 's' : ''}!
      </Text>
      {options.save && filepath && (
        <Box marginTop={1}>
          <Text>
            Saved to: <Text color="cyan">{filepath}</Text>
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          Use <Text bold>cidrly view --plan={options.plan}</Text> to see the results.
        </Text>
      </Box>
    </Box>
  );
}
