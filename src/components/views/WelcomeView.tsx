/**
 * WelcomeView Component
 * Clean, professional welcome screen with modern aesthetic
 */

import fs from 'fs';
import { Box, Text } from 'ink';
import path from 'path';
import React, { useEffect, useRef, useState } from 'react';
import packageJson from '../../../package.json' with { type: 'json' };
import type { NetworkPlan } from '../../core/models/network-plan.js';
import { createNetworkPlan } from '../../core/models/network-plan.js';
import { validateIpAddress } from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { usePlanActions } from '../../hooks/usePlan.js';
import { useNavigation, useNotify } from '../../hooks/useUI.js';
import { FILE_RULES } from '../../infrastructure/config/validation-rules.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import { importService } from '../../services/import/import.service.js';
import type { ImportFormat } from '../../services/import/import.types.js';
import { usePlanStore } from '../../store/planStore.js';
import { colors } from '../../themes/colors.js';
import { getErrorMessage, isErrnoException } from '../../utils/error-helpers.js';
import { unescapeShellPath } from '../../utils/path-helpers.js';
import { ImportPreviewDialog } from '../dialogs/ImportPreviewDialog.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { SelectDialog } from '../dialogs/SelectDialog.js';
import { FilePicker } from '../widgets/FilePicker.js';

interface ImportFileInfo {
  filename: string;
  path: string;
  modifiedAt: Date;
}

type WelcomeState =
  | { type: 'initial' }
  | { type: 'create-ip' }
  | { type: 'load-select'; directoryPath?: string }
  | { type: 'load-custom-path' }
  | { type: 'import-format-select' }
  | { type: 'import-router-select' }
  | { type: 'import-file'; format?: string }
  | { type: 'import-filepicker'; format?: string; files: ImportFileInfo[]; directoryPath: string }
  | {
      type: 'import-preview';
      plan: NetworkPlan;
      importedCount: number;
      skippedCount: number;
      warnings: string[];
    }
  | { type: 'error'; message: string };

export const WelcomeView: React.FC = () => {
  const [state, setState] = useState<WelcomeState>({ type: 'initial' });
  const { loadPlan } = usePlanActions();
  const setCurrentFilename = usePlanStore.use.setCurrentFilename();
  const { goToDashboard } = useNavigation();
  const notify = useNotify();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Get saved plans from specified directory or default
  const getSavedPlans = (directoryPath?: string): Array<{ label: string; value: string }> => {
    const targetPath = directoryPath ?? path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR);

    try {
      const files = fs.readdirSync(targetPath);
      return files
        .filter((file) => file.endsWith('.cidr') || file.endsWith('.json'))
        .map((file) => {
          const label = file.replace(/\.(cidr|json)$/, '');
          const truncatedLabel = label.length > 35 ? label.substring(0, 32) + '...' : label;
          return {
            label: truncatedLabel,
            value: path.join(targetPath, file),
          };
        });
    } catch {
      return [];
    }
  };

  // Handle action selection
  const handleActionSelect = (action: string): void => {
    if (action === 'new') {
      // Skip plan name input - will default to "Untitled" and match filename on save
      setState({ type: 'create-ip' });
    } else if (action === 'load') {
      // Always show load dialog, even if no saved plans (custom path option available)
      setState({ type: 'load-select' });
    } else if (action === 'import') {
      setState({ type: 'import-format-select' });
    }
  };

  // Handle import format selection
  const handleImportFormatSelected = (format: string): void => {
    if (format === 'auto') {
      setState({ type: 'import-file' });
    } else {
      setState({ type: 'import-file', format });
    }
  };

  // Handle import file path
  const handleImportFile = (filepath: string, format?: string): void => {
    (async (): Promise<void> => {
      try {
        // Check if path exists
        let stats;
        try {
          stats = fs.statSync(filepath);
        } catch (error) {
          if (isErrnoException(error) && error.code === 'ENOENT') {
            setState({ type: 'error', message: 'File not found' });
            timerRef.current = setTimeout(() => setState({ type: 'import-file', format }), 2000);
            return;
          }
          throw error;
        }

        // Check for native cidrly format files - these should use Load, not Import
        const lowerPath = filepath.toLowerCase();
        if (lowerPath.endsWith('.cidr') || lowerPath.endsWith('.json')) {
          setState({ type: 'error', message: 'Use "Load Existing Plan" for .cidr/.json files' });
          timerRef.current = setTimeout(() => setState({ type: 'initial' }), 2000);
          return;
        }

        // Handle directory - list files with supported extensions
        if (stats.isDirectory()) {
          const supportedExtensions = ['.csv', '.yaml', '.yml', '.cfg', '.conf'];
          const files = fs
            .readdirSync(filepath)
            .filter((file) => supportedExtensions.some((ext) => file.toLowerCase().endsWith(ext)))
            .map((file) => ({
              filename: file,
              path: `${filepath}/${file}`,
              modifiedAt: fs.statSync(`${filepath}/${file}`).mtime,
            }));

          if (files.length === 0) {
            setState({ type: 'error', message: 'No importable files found in directory' });
            timerRef.current = setTimeout(() => setState({ type: 'import-file', format }), 2000);
            return;
          }

          setState({
            type: 'import-filepicker',
            format,
            files,
            directoryPath: filepath,
          });
          return;
        }

        // Parse the file
        const importFormat = format as ImportFormat | undefined;
        const result = await importService.importFromFile(filepath, importFormat, {
          options: { mode: 'create', skipDuplicateVlans: true },
        });

        if (!result.parseResult.success) {
          const errorMsg = result.parseResult.errors[0]?.message ?? 'Parse failed';
          setState({ type: 'error', message: `Import failed: ${errorMsg}` });
          timerRef.current = setTimeout(() => setState({ type: 'import-file', format }), 2000);
          return;
        }

        if (!result.plan || !result.importResult?.success) {
          setState({ type: 'error', message: 'Import failed: Could not create plan' });
          timerRef.current = setTimeout(() => setState({ type: 'import-file', format }), 2000);
          return;
        }

        // Show preview
        setState({
          type: 'import-preview',
          plan: result.plan,
          importedCount: result.importResult.importedCount,
          skippedCount: result.importResult.skippedCount,
          warnings: result.importResult.warnings,
        });
      } catch (error) {
        setState({
          type: 'error',
          message: `Import failed: ${getErrorMessage(error)}`,
        });
        timerRef.current = setTimeout(() => setState({ type: 'import-file', format }), 2000);
      }
    })();
  };

  // Handle import confirmation
  const handleImportConfirm = (importedPlan: NetworkPlan): void => {
    loadPlan(importedPlan);
    notify.success(`Imported "${importedPlan.name}" with ${importedPlan.subnets.length} subnets`);
    goToDashboard();
  };

  // Handle base IP input and create plan
  const handleBaseIpSubmit = (baseIp: string): void => {
    // Plan name defaults to "Untitled" - will be updated to match filename on first save
    const plan = createNetworkPlan('Untitled', baseIp);
    loadPlan(plan);
    notify.success(`Plan created successfully!`);
    goToDashboard();
  };

  // Handle loading existing plan selection
  const handleLoadPlanSelect = (filepath: string): void => {
    if (filepath === '__custom__') {
      setState({ type: 'load-custom-path' });
      return;
    }
    handleLoadPlan(filepath);
  };

  // Handle loading existing plan
  const handleLoadPlan = (filepath: string): void => {
    try {
      // Check if path is a directory
      let stats;
      try {
        stats = fs.statSync(filepath);
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ENOENT') {
          setState({ type: 'error', message: 'File not found' });
          timerRef.current = setTimeout(() => setState({ type: 'initial' }), 2000);
          return;
        }
        throw error;
      }
      if (stats.isDirectory()) {
        // List .cidrly.json files in the directory
        const files = getSavedPlans(filepath);

        if (files.length === 0) {
          setState({ type: 'error', message: 'No .cidr or .json files found in directory' });
          timerRef.current = setTimeout(() => setState({ type: 'load-select' }), 2000);
          return;
        }

        // Update the select dialog to show files from this directory
        setState({ type: 'load-select', directoryPath: filepath });
        return;
      }

      // It's a file - load it
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const plan = parseNetworkPlan(JSON.parse(fileContent), filepath);

      // Extract filename from path (without extension) for display and auto-save tracking
      const filename = filepath.split('/').pop() ?? filepath;
      const planName = filename.replace(/\.(cidr|json)$/, '');

      // Update plan name to match filename (without extension)
      plan.name = planName;
      loadPlan(plan);

      setCurrentFilename(filename);

      notify.success(`Plan "${planName}" loaded successfully!`);
      goToDashboard();
    } catch (error) {
      if (isFileOperationError(error)) {
        setState({ type: 'error', message: error.getUserMessage() });
      } else {
        setState({
          type: 'error',
          message: `Failed to load plan: ${getErrorMessage(error)}`,
        });
      }
      timerRef.current = setTimeout(() => setState({ type: 'initial' }), 2000);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Welcome Header - Clean, modern wordmark */}
      <Box marginBottom={1}>
        <Text bold>{colors.accent('cidrly')}</Text>
        <Text> </Text>
        <Text>{colors.dim(`v${packageJson.version}`)}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{colors.muted('Network Architecture & Design Planning')}</Text>
      </Box>

      {/* State Machine */}
      {state.type === 'initial' && (
        <SelectDialog
          title="Welcome"
          items={[
            { label: 'Create New Plan', value: 'new' },
            { label: 'Load Existing Plan', value: 'load' },
            { label: 'Import Configuration', value: 'import' },
          ]}
          onSelect={handleActionSelect}
          onCancel={() => process.exit(0)}
        />
      )}

      {state.type === 'create-ip' && (
        <InputDialog
          title="Create New Plan"
          label="Base IP address"
          defaultValue="10.0.0.0"
          onSubmit={handleBaseIpSubmit}
          onCancel={() => setState({ type: 'initial' })}
          validate={validateIpAddress}
        />
      )}

      {state.type === 'load-select' && (
        <SelectDialog
          title={
            state.directoryPath
              ? `Load Plan from ${state.directoryPath.split('/').pop() ?? state.directoryPath}`
              : 'Load Existing Plan'
          }
          items={[
            ...getSavedPlans(state.directoryPath),
            { label: '→ Enter custom path...', value: '__custom__' },
          ]}
          onSelect={handleLoadPlanSelect}
          onCancel={() => setState({ type: 'initial' })}
        />
      )}

      {state.type === 'load-custom-path' && (
        <InputDialog
          title="Load Plan"
          label="File path (from ~/cidrly/saved-plans or absolute path):"
          preprocessInput={unescapeShellPath}
          onSubmit={handleLoadPlan}
          onCancel={() => setState({ type: 'load-select' })}
        />
      )}

      {state.type === 'import-format-select' && (
        <SelectDialog
          title="Import From"
          items={[
            { label: 'Auto-detect format', value: 'auto' },
            { label: 'CSV', value: 'csv' },
            { label: 'YAML', value: 'yaml' },
            { label: 'Network Config →', value: 'router-menu' },
          ]}
          onSelect={(value) => {
            if (value === 'router-menu') {
              setState({ type: 'import-router-select' });
            } else {
              handleImportFormatSelected(value);
            }
          }}
          onCancel={() => setState({ type: 'initial' })}
        />
      )}

      {state.type === 'import-router-select' && (
        <SelectDialog
          title="Import Network Config"
          items={[
            { label: 'Cisco IOS/IOS-XE', value: 'cisco-ios' },
            { label: 'Cisco NX-OS', value: 'cisco-nxos' },
            { label: 'Arista EOS', value: 'arista-eos' },
            { label: 'Juniper JUNOS', value: 'juniper-junos' },
            { label: 'Fortinet FortiOS', value: 'fortinet' },
            { label: 'Netgear', value: 'netgear' },
            { label: 'Ubiquiti EdgeOS', value: 'ubiquiti' },
          ]}
          onSelect={handleImportFormatSelected}
          onCancel={() => setState({ type: 'import-format-select' })}
        />
      )}

      {state.type === 'import-file' && (
        <InputDialog
          title="Import File"
          label="File path (drag & drop supported):"
          helperText={state.format ? `Format: ${state.format}` : 'Format: auto-detect'}
          preprocessInput={unescapeShellPath}
          onSubmit={(filepath) => handleImportFile(filepath, state.format)}
          onCancel={() => setState({ type: 'import-format-select' })}
        />
      )}

      {state.type === 'import-filepicker' && (
        <FilePicker
          title={`Import from ${state.directoryPath.split('/').pop() ?? state.directoryPath}`}
          files={[
            ...state.files,
            { filename: '→ Enter custom path...', path: '__custom__', modifiedAt: new Date() },
          ]}
          onSelect={(selectedPath) => {
            if (selectedPath === '__custom__') {
              setState({ type: 'import-file', format: state.format });
            } else {
              handleImportFile(selectedPath, state.format);
            }
          }}
          onCancel={() => setState({ type: 'import-format-select' })}
        />
      )}

      {state.type === 'import-preview' && (
        <ImportPreviewDialog
          plan={state.plan}
          importedCount={state.importedCount}
          skippedCount={state.skippedCount}
          warnings={state.warnings}
          onConfirm={() => handleImportConfirm(state.plan)}
          onCancel={() => setState({ type: 'import-format-select' })}
        />
      )}

      {state.type === 'error' && (
        <Box
          borderStyle="round"
          borderColor="red"
          backgroundColor="black"
          paddingX={2}
          paddingY={1}
        >
          <Text>{colors.error(state.message)}</Text>
        </Box>
      )}
    </Box>
  );
};
