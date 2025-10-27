/**
 * Save Command
 * Saves the current network plan to a file
 * Note: This command is mainly for explicit save operations.
 * Most commands auto-save by default.
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React from 'react';
import { z as zod } from 'zod';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  plan: zod.string().describe('Plan file to save (e.g., my-plan.json)'),
  output: zod.string().optional().describe('Output filename (default: same as input)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Save({ options }: Props): React.ReactElement {
  const [status, setStatus] = React.useState<'loading' | 'saving' | 'done' | 'error'>('loading');
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    async function savePlan(): Promise<void> {
      try {
        // Load plan
        setStatus('loading');
        const fileService = new FileService(
          path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR),
        );
        const repository = new FileSystemRepository(fileService);

        const plan = await repository.load(options.plan);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
        if (!plan) {
          throw new Error(`Plan not found: ${options.plan}`);
        }

        // Save to output file (or same file if not specified)
        setStatus('saving');
        const outputFile = options.output ?? options.plan;
        const savedPath = await repository.save(plan, outputFile);
        setFilepath(savedPath);

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void savePlan();
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

  if (status === 'saving') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Saving plan...
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
      <Text>Plan saved successfully!</Text>
      <Box marginTop={1}>
        <Text>
          Saved to: <Text color="cyan">{filepath}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Use <Text bold>cidrly view --plan={options.output ?? options.plan}</Text> to view the
          plan.
        </Text>
      </Box>
    </Box>
  );
}
