/**
 * WelcomeView Component
 * Clean, professional welcome screen with modern aesthetic
 */

import fs from 'fs';
import { Box, Text } from 'ink';
import path from 'path';
import React, { useState } from 'react';
import packageJson from '../../../package.json' with { type: 'json' };
import { createNetworkPlan } from '../../core/models/network-plan.js';
import { validateIpAddress } from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { usePlanActions } from '../../hooks/usePlan.js';
import { useNavigation, useNotify } from '../../hooks/useUI.js';
import { FILE_RULES } from '../../infrastructure/config/validation-rules.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import { usePlanStore } from '../../store/planStore.js';
import { colors } from '../../themes/colors.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { SelectDialog } from '../dialogs/SelectDialog.js';

type WelcomeState =
  | { type: 'initial' }
  | { type: 'create-ip' }
  | { type: 'load-select'; directoryPath?: string }
  | { type: 'load-custom-path' }
  | { type: 'error'; message: string };

export const WelcomeView: React.FC = () => {
  const [state, setState] = useState<WelcomeState>({ type: 'initial' });
  const { loadPlan } = usePlanActions();
  const setCurrentFilename = usePlanStore.use.setCurrentFilename();
  const { goToDashboard } = useNavigation();
  const notify = useNotify();

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
    }
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
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          setState({ type: 'error', message: 'File not found' });
          setTimeout(() => setState({ type: 'initial' }), 2000);
          return;
        }
        throw error;
      }
      if (stats.isDirectory()) {
        // List .cidrly.json files in the directory
        const files = getSavedPlans(filepath);

        if (files.length === 0) {
          setState({ type: 'error', message: 'No .cidr or .json files found in directory' });
          setTimeout(() => setState({ type: 'load-select' }), 2000);
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
          message: `Failed to load plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
      setTimeout(() => setState({ type: 'initial' }), 2000);
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
          onSubmit={handleLoadPlan}
          onCancel={() => setState({ type: 'load-select' })}
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
