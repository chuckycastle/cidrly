/**
 * Load Command
 * Loads and displays available network plans
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { z as zod } from 'zod';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  list: zod.boolean().default(false).describe('List all available plans'),
  plan: zod.string().optional().describe('Plan file to load and display (e.g., my-plan.json)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Load({ options }: Props): React.ReactElement {
  const [status, setStatus] = React.useState<'loading' | 'done' | 'error'>('loading');
  const [files, setFiles] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    async function loadPlans(): Promise<void> {
      try {
        setStatus('loading');
        const fileService = new FileService(FILE_RULES.SAVED_PLANS_DIR);
        const repository = new FileSystemRepository(fileService);

        if (options.list) {
          // List all available plans
          const allFiles = await repository.listAll();
          setFiles(allFiles);
        } else if (options.plan) {
          // Load specific plan and display basic info
          const plan = await repository.load(options.plan);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
          if (!plan) {
            throw new Error(`Plan not found: ${options.plan}`);
          }
          // Store plan name for display (using files array to avoid adding new state)
          setFiles([
            `Name: ${plan.name}`,
            `Base IP: ${plan.baseIp}`,
            `Subnets: ${plan.subnets.length}`,
            `File: ${options.plan}`,
          ]);
        } else {
          throw new Error(
            'Please specify --list to see all plans or --plan=<filename> to load a specific plan',
          );
        }

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void loadPlans();
  }, []);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />{' '}
          {options.list ? 'Loading plans...' : `Loading plan "${options.plan}"...`}
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

  if (options.list) {
    if (files.length === 0) {
      return (
        <Box borderStyle="round" borderColor="yellow" padding={1}>
          <Text color="yellow">⚠ No saved plans found.</Text>
          <Text> </Text>
          <Text dimColor>
            Create a plan with: <Text bold>cidrly create --name="My Plan" --save</Text>
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
          <Text color="cyan" bold>
            Available Plans ({files.length})
          </Text>
        </Box>
        {files.map((file, idx) => (
          <Box key={idx} marginBottom={idx === files.length - 1 ? 0 : 1}>
            <Text color="cyan">• </Text>
            <Text>{file}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text dimColor>
            Load a plan with: <Text bold>cidrly view --plan=&lt;filename&gt;</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  // Display loaded plan info
  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="green" padding={1} marginBottom={1}>
        <Text color="green">✓ Plan Loaded</Text>
      </Box>
      {files.map((info, idx) => (
        <Text key={idx}>{info}</Text>
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          View full details with: <Text bold>cidrly view --plan={options.plan}</Text>
        </Text>
      </Box>
    </Box>
  );
}
