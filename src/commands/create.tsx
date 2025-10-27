/**
 * Create Command
 * Creates a new network plan
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React from 'react';
import { z as zod } from 'zod';
import { createNetworkPlan } from '../core/models/network-plan.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  name: zod.string().describe('Plan name'),
  baseIp: zod.string().default('10.0.0.0').describe('Base IP address (default: 10.0.0.0)'),
  save: zod.boolean().default(false).describe('Save plan to file immediately'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Create({ options }: Props): React.ReactElement {
  const [status, setStatus] = React.useState<'creating' | 'saving' | 'done' | 'error'>('creating');
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    async function createPlan(): Promise<void> {
      try {
        // Create the plan
        const plan = createNetworkPlan(options.name, options.baseIp);

        // Save if requested
        if (options.save) {
          setStatus('saving');
          const fileService = new FileService(
            path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR),
          );
          const repository = new FileSystemRepository(fileService);
          const savedPath = await repository.save(
            plan,
            `${options.name.replace(/\s+/g, '-').toLowerCase()}.json`,
          );
          setFilepath(savedPath);
        }

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void createPlan();
  }, []);

  if (status === 'creating') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Creating plan "{options.name}"...
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
        Plan <Text bold>"{options.name}"</Text> created successfully!
      </Text>
      <Text>
        Base IP: <Text color="cyan">{options.baseIp}</Text>
      </Text>
      {filepath && (
        <Box marginTop={1}>
          <Text>
            Saved to: <Text color="cyan">{filepath}</Text>
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          Use <Text bold>cidrly add</Text> to add subnets or <Text bold>cidrly dashboard</Text> to
          launch interactive mode.
        </Text>
      </Box>
    </Box>
  );
}
