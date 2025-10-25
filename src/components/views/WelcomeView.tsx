/**
 * WelcomeView Component
 * Clean, professional welcome screen with modern aesthetic
 */

import fs from 'fs';
import { Box, Text } from 'ink';
import path from 'path';
import React, { useState } from 'react';
import { createNetworkPlan } from '../../core/models/network-plan.js';
import { validateIpAddress, validatePlanName } from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { usePlanActions } from '../../hooks/usePlan.js';
import { useNavigation, useNotify } from '../../hooks/useUI.js';
import { FILE_RULES } from '../../infrastructure/config/validation-rules.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import { colors } from '../../themes/colors.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { SelectDialog } from '../dialogs/SelectDialog.js';

type WelcomeState =
  | { type: 'initial' }
  | { type: 'create-name' }
  | { type: 'create-ip' }
  | { type: 'load-select' }
  | { type: 'error'; message: string };

export const WelcomeView: React.FC = () => {
  const [state, setState] = useState<WelcomeState>({ type: 'initial' });
  const [planName, setPlanName] = useState('');
  const { loadPlan } = usePlanActions();
  const { goToDashboard } = useNavigation();
  const notify = useNotify();

  // Get saved plans
  const getSavedPlans = (): Array<{ label: string; value: string }> => {
    const savedPlansPath = path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR);

    if (!fs.existsSync(savedPlansPath)) {
      return [];
    }

    try {
      const files = fs.readdirSync(savedPlansPath);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          const label = file.replace('.json', '');
          const truncatedLabel = label.length > 35 ? label.substring(0, 32) + '...' : label;
          return {
            label: truncatedLabel,
            value: path.join(savedPlansPath, file),
          };
        });
    } catch {
      return [];
    }
  };

  // Handle action selection
  const handleActionSelect = (action: string) => {
    if (action === 'new') {
      setState({ type: 'create-name' });
    } else if (action === 'load') {
      const savedPlans = getSavedPlans();
      if (savedPlans.length === 0) {
        setState({ type: 'error', message: 'No saved plans found. Creating new plan instead.' });
        setTimeout(() => setState({ type: 'create-name' }), 2000);
      } else {
        setState({ type: 'load-select' });
      }
    }
  };

  // Handle plan name input
  const handlePlanNameSubmit = (name: string) => {
    setPlanName(name);
    setState({ type: 'create-ip' });
  };

  // Handle base IP input and create plan
  const handleBaseIpSubmit = (baseIp: string) => {
    const plan = createNetworkPlan(planName, baseIp);
    loadPlan(plan);
    notify.success(`Plan "${planName}" created successfully!`);
    goToDashboard();
  };

  // Handle loading existing plan
  const handleLoadPlan = (filepath: string) => {
    try {
      if (!fs.existsSync(filepath)) {
        setState({ type: 'error', message: 'File not found' });
        setTimeout(() => setState({ type: 'initial' }), 2000);
        return;
      }

      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const plan = parseNetworkPlan(JSON.parse(fileContent), filepath);
      loadPlan(plan);
      notify.success(`Plan "${plan.name}" loaded successfully!`);
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
        <Text>{colors.dim('v1.0')}</Text>
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

      {state.type === 'create-name' && (
        <InputDialog
          title="Create New Plan"
          label="Plan name"
          onSubmit={handlePlanNameSubmit}
          onCancel={() => setState({ type: 'initial' })}
          validate={validatePlanName}
        />
      )}

      {state.type === 'create-ip' && (
        <InputDialog
          title="Create New Plan"
          label="Base IP address"
          defaultValue="10.0.0.0"
          onSubmit={handleBaseIpSubmit}
          onCancel={() => setState({ type: 'create-name' })}
          validate={validateIpAddress}
        />
      )}

      {state.type === 'load-select' && (
        <SelectDialog
          title="Load Existing Plan"
          items={getSavedPlans()}
          onSelect={handleLoadPlan}
          onCancel={() => setState({ type: 'initial' })}
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
