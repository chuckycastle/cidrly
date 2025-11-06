/**
 * Export Command
 * Exports a network plan to various formats (YAML, CSV, PDF)
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { z as zod } from 'zod';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { ExportService, type ExportFormat } from '../services/export.service.js';
import { FileService } from '../services/file.service.js';
import { PreferencesService } from '../services/preferences.service.js';

export const options = zod.object({
  plan: zod.string().describe('Plan file to export (e.g., my-plan.json)'),
  format: zod.enum(['yaml', 'csv', 'pdf']).describe('Export format (yaml, csv, pdf)'),
  output: zod
    .string()
    .optional()
    .describe('Output filename (default: plan-name.<format-extension>)'),
});

type Props = {
  options: zod.infer<typeof options>;
};

export default function Export({ options }: Props): React.ReactElement {
  const [status, setStatus] = React.useState<'loading' | 'exporting' | 'done' | 'error'>('loading');
  const [filepath, setFilepath] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [planName, setPlanName] = React.useState<string>('');

  React.useEffect(() => {
    async function exportPlan(): Promise<void> {
      try {
        // Load plan
        setStatus('loading');
        const fileService = new FileService(FILE_RULES.SAVED_PLANS_DIR);
        const repository = new FileSystemRepository(fileService);

        const plan = await repository.load(options.plan);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
        if (!plan) {
          throw new Error(`Plan not found: ${options.plan}`);
        }

        setPlanName(plan.name);

        // Load preferences for column configuration
        const preferencesService = new PreferencesService();
        const preferences = await preferencesService.loadPreferences();

        // Export to specified format
        setStatus('exporting');
        const exportService = new ExportService();
        const exportedPath = await exportService.export(
          plan,
          options.format as ExportFormat,
          options.output,
          preferences,
        );
        setFilepath(exportedPath);

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void exportPlan();
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

  if (status === 'exporting') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Exporting to {options.format.toUpperCase()}...
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
        <Text color="green">✓ EXPORT SUCCESSFUL</Text>
      </Box>
      <Text>
        Plan "<Text bold>{planName}</Text>" exported to {options.format.toUpperCase()}
      </Text>
      <Box marginTop={1}>
        <Text>
          Saved to: <Text color="cyan">{filepath}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Run "cidrly dashboard" to continue editing your plan.</Text>
      </Box>
    </Box>
  );
}
