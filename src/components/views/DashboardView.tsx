/**
 * DashboardView Component
 * Main interactive dashboard with subnet management
 */

import fs from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React, { useState } from 'react';
import { createSubnet } from '../../core/models/network-plan.js';
import {
  validateDeviceCount,
  validateIpAddress,
  validateSubnetName,
  validateVlanId,
} from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { usePlan, usePlanActions, useSubnets } from '../../hooks/usePlan.js';
import { useNotify, useSelection } from '../../hooks/useUI.js';
import { FILE_RULES } from '../../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../../repositories/index.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import type { SavedPlanFile } from '../../services/file.service.js';
import { FileService } from '../../services/file.service.js';
import { colors } from '../../themes/colors.js';
import { parseDeviceCount, parseVlanId } from '../../utils/input-helpers.js';
import { ConfirmDialog } from '../dialogs/ConfirmDialog.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { Modal } from '../dialogs/Modal.js';
import { SelectDialog } from '../dialogs/SelectDialog.js';
import { SubnetInfoDialog } from '../dialogs/SubnetInfoDialog.js';
import { FilePicker } from '../widgets/FilePicker.js';
import { SubnetTable } from '../widgets/SubnetTable.js';

type DialogType =
  | { type: 'none' }
  | { type: 'info' }
  | { type: 'loading'; message: string }
  | {
      type: 'input';
      title: string;
      label: string;
      defaultValue?: string;
      onSubmit: (value: string) => void;
      validate?: (value: string) => boolean | string;
    }
  | {
      type: 'select';
      title: string;
      items: Array<{ label: string; value: string }>;
      onSelect: (value: string) => void;
    }
  | {
      type: 'filepicker';
      title: string;
      files: SavedPlanFile[];
      onSelect: (filepath: string) => void;
    }
  | { type: 'confirm'; title: string; message: string; onConfirm: (result: boolean) => void };

export const DashboardView: React.FC = () => {
  const { exit } = useApp();
  const plan = usePlan();
  const subnets = useSubnets();
  const { addSubnet, updateSubnet, removeSubnet, calculatePlan, updateBaseIp, loadPlan } =
    usePlanActions();
  const notify = useNotify();
  const {
    selectedIndex,
    select: setSelectedIndex,
    moveUp,
    moveDown,
  } = useSelection(subnets.length - 1);

  const [dialog, setDialog] = useState<DialogType>({ type: 'none' });

  const fileService = new FileService(path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR));
  const repository = new FileSystemRepository(fileService);

  // Action handlers (need to be defined before keyboard shortcuts)
  const handleShowSubnetDetails = (): void => {
    if (!plan) return;
    const subnet = subnets[selectedIndex];
    if (!subnet) {
      notify.error('No subnet selected');
      return;
    }
    if (!subnet.subnetInfo) {
      notify.error('Subnet has not been calculated yet');
      return;
    }
    setDialog({ type: 'info' });
  };

  const handleAddSubnet = (): void => {
    setDialog({
      type: 'input',
      title: 'Add Subnet',
      label: 'Enter subnet name:',
      onSubmit: (name) => {
        setDialog({
          type: 'input',
          title: 'Add Subnet',
          label: 'Enter VLAN ID (1-4094):',
          onSubmit: (vlanIdStr) => {
            setDialog({
              type: 'input',
              title: 'Add Subnet',
              label: 'Enter expected number of devices:',
              onSubmit: (expectedDevicesStr) => {
                const vlanId = parseVlanId(vlanIdStr);
                const expectedDevices = parseDeviceCount(expectedDevicesStr);
                const subnet = createSubnet(name, vlanId, expectedDevices);
                addSubnet(subnet);
                notify.success(
                  `Subnet "${name}" added! (Planning for ${subnet.expectedDevices * 2} devices using 50% rule)`,
                );
                setDialog({ type: 'none' });
              },
              validate: validateDeviceCount,
            });
          },
          validate: validateVlanId,
        });
      },
      validate: validateSubnetName,
    });
  };

  const handleEditSubnet = (): void => {
    if (!plan || subnets.length === 0) return;
    const subnet = subnets[selectedIndex];
    if (!subnet) {
      notify.error('No subnet selected');
      return;
    }
    setDialog({
      type: 'input',
      title: 'Edit Subnet',
      label: 'Enter subnet name:',
      defaultValue: subnet.name,
      onSubmit: (name) => {
        setDialog({
          type: 'input',
          title: 'Edit Subnet',
          label: 'Enter VLAN ID (1-4094):',
          defaultValue: subnet.vlanId.toString(),
          onSubmit: (vlanIdStr) => {
            setDialog({
              type: 'input',
              title: 'Edit Subnet',
              label: 'Enter expected number of devices:',
              defaultValue: subnet.expectedDevices.toString(),
              onSubmit: (expectedDevicesStr) => {
                updateSubnet(
                  selectedIndex,
                  name,
                  parseVlanId(vlanIdStr),
                  parseDeviceCount(expectedDevicesStr),
                );
                notify.success(`Subnet "${name}" updated successfully!`);
                setDialog({ type: 'none' });
              },
              validate: validateDeviceCount,
            });
          },
          validate: validateVlanId,
        });
      },
      validate: validateSubnetName,
    });
  };

  const handleDeleteSubnet = (): void => {
    if (!plan || subnets.length === 0) return;
    const subnet = subnets[selectedIndex];
    if (!subnet) {
      notify.error('No subnet selected');
      return;
    }
    setDialog({
      type: 'confirm',
      title: 'Delete Subnet',
      message: `Delete "${subnet.name}" (VLAN ${subnet.vlanId})?\n\nThis cannot be undone.`,
      onConfirm: (confirmed) => {
        if (confirmed) {
          const removed = removeSubnet(selectedIndex);
          if (removed) {
            // Adjust selected index
            if (subnets.length === 0) {
              setSelectedIndex(0);
            } else if (selectedIndex >= subnets.length) {
              setSelectedIndex(subnets.length - 1);
            }
            notify.success(`Subnet "${removed.name}" deleted.`);
          }
        }
        setDialog({ type: 'none' });
      },
    });
  };

  const handleCalculatePlan = (): void => {
    if (!plan || subnets.length === 0) {
      notify.error('Please add at least one subnet before calculating.');
      return;
    }
    calculatePlan();
    notify.success('Network plan calculated successfully!');
  };

  const handleSavePlan = (): void => {
    if (!plan?.supernet) return;
    const defaultFilename = `${plan.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    setDialog({
      type: 'input',
      title: 'Save Plan',
      label: 'File path (from ~/cidrly/saved-plans or absolute path):',
      defaultValue: defaultFilename,
      onSubmit: (filename) => {
        void (async (): Promise<void> => {
          setDialog({ type: 'loading', message: 'Saving plan...' });
          try {
            const filepath = await repository.save(plan, filename);
            notify.success(`Plan saved to ${filepath}`);
          } catch (error) {
            if (isFileOperationError(error)) {
              notify.error(error.getUserMessage());
            } else {
              notify.error(
                `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }
          setDialog({ type: 'none' });
        })();
      },
    });
  };

  const handleLoadPlan = async (): Promise<void> => {
    try {
      const savedPlans = await fileService.listPlans();

      // Add "Enter custom path" option at the end
      const filesWithCustomOption: SavedPlanFile[] = [
        ...savedPlans,
        {
          filename: '→ Enter custom path...',
          path: '__custom__',
          modifiedAt: new Date(),
        },
      ];

      setDialog({
        type: 'filepicker',
        title: 'Load Plan',
        files: savedPlans.length > 0 ? filesWithCustomOption : [],
        onSelect: (filepath: string) => {
          if (filepath === '__custom__') {
            handleLoadCustomPath();
          } else {
            handleLoadSelectedPlan(filepath);
          }
        },
      });

      // If no saved plans, directly show custom path input
      if (savedPlans.length === 0) {
        handleLoadCustomPath();
      }
    } catch (error) {
      notify.error(
        `Failed to list plans: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleLoadCustomPath = (): void => {
    setDialog({
      type: 'input',
      title: 'Load Plan',
      label: 'File path (from ~/cidrly/saved-plans or absolute path):',
      onSubmit: (filepath: string) => {
        handleLoadSelectedPlan(filepath);
      },
    });
  };

  const handleLoadSelectedPlan = (filepath: string): void => {
    setDialog({ type: 'loading', message: 'Loading plan...' });

    try {
      if (!fs.existsSync(filepath)) {
        notify.error('File not found');
        setDialog({ type: 'none' });
        return;
      }

      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const loadedPlan = parseNetworkPlan(JSON.parse(fileContent), filepath);
      loadPlan(loadedPlan);
      notify.success(`Plan "${loadedPlan.name}" loaded successfully!`);
      setDialog({ type: 'none' });
    } catch (error) {
      if (isFileOperationError(error)) {
        notify.error(error.getUserMessage());
      } else {
        notify.error(
          `Failed to load plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      setDialog({ type: 'none' });
    }
  };

  const handleChangeBaseIp = (): void => {
    if (!plan) return;
    setDialog({
      type: 'input',
      title: 'Change Base IP',
      label: 'Enter new base IP address:',
      defaultValue: plan.baseIp,
      onSubmit: (newBaseIp) => {
        updateBaseIp(newBaseIp);

        if (subnets.length > 0) {
          notify.success(`Base IP updated to ${newBaseIp}. Network addresses recalculated.`);
        } else {
          notify.success(`Base IP updated to ${newBaseIp}.`);
        }
        setDialog({ type: 'none' });
      },
      validate: validateIpAddress,
    });
  };

  // Keyboard shortcuts configuration
  useKeyboardShortcuts({
    shortcuts: [
      // Navigation
      {
        key: 'upArrow',
        description: 'Move selection up',
        handler: (): void => {
          if (plan) moveUp();
        },
        category: 'navigation',
      },
      {
        key: 'k',
        description: 'Move selection up (vim)',
        handler: (): void => {
          if (plan) moveUp();
        },
        category: 'navigation',
      },
      {
        key: 'downArrow',
        description: 'Move selection down',
        handler: (): void => {
          if (plan) moveDown();
        },
        category: 'navigation',
      },
      {
        key: 'j',
        description: 'Move selection down (vim)',
        handler: (): void => {
          if (plan) moveDown();
        },
        category: 'navigation',
      },
      // Actions
      {
        key: 'i',
        description: 'Show subnet details',
        handler: (): void => {
          if (plan && subnets.length > 0) handleShowSubnetDetails();
        },
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 'return',
        description: 'Show subnet details',
        handler: (): void => {
          if (plan && subnets.length > 0) handleShowSubnetDetails();
        },
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 'a',
        description: 'Add new subnet',
        handler: handleAddSubnet,
        category: 'actions',
      },
      {
        key: 'e',
        description: 'Edit selected subnet',
        handler: (): void => {
          if (plan && subnets.length > 0) handleEditSubnet();
        },
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 'x',
        description: 'Delete selected subnet',
        handler: (): void => {
          if (plan && subnets.length > 0) handleDeleteSubnet();
        },
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 'c',
        description: 'Calculate network plan',
        handler: handleCalculatePlan,
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 's',
        description: 'Save plan to file',
        handler: (): void => {
          void handleSavePlan();
        },
        category: 'actions',
        enabled: !!plan?.supernet,
      },
      {
        key: 'l',
        description: 'Load plan from file',
        handler: (): void => {
          void handleLoadPlan();
        },
        category: 'actions',
      },
      {
        key: 'b',
        description: 'Change base IP address',
        handler: handleChangeBaseIp,
        category: 'actions',
      },
      // System
      {
        key: 'q',
        description: 'Quit dashboard',
        handler: (): void => {
          exit();
        },
        category: 'system',
      },
    ],
    enabled: dialog.type === 'none', // Only handle input when no dialog is open
  });

  if (!plan) {
    return (
      <Box>
        <Text>No plan loaded</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Hide table when dialog is open to prevent text overlap */}
      {dialog.type === 'none' && <SubnetTable subnets={subnets} selectedIndex={selectedIndex} />}

      {/* Dialogs */}
      {dialog.type === 'loading' && (
        <Modal>
          <Box
            borderStyle="round"
            borderColor="cyan"
            paddingX={2}
            paddingY={1}
            justifyContent="center"
          >
            <Text>
              <Text>{colors.accent(<Spinner type="dots" />)}</Text> {colors.muted(dialog.message)}
            </Text>
          </Box>
        </Modal>
      )}
      {dialog.type === 'info' && subnets[selectedIndex] && (
        <Modal>
          <SubnetInfoDialog
            subnet={subnets[selectedIndex]}
            onClose={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {dialog.type === 'input' && (
        <Modal>
          <InputDialog
            title={dialog.title}
            label={dialog.label}
            defaultValue={dialog.defaultValue}
            onSubmit={dialog.onSubmit}
            onCancel={() => setDialog({ type: 'none' })}
            validate={dialog.validate}
          />
        </Modal>
      )}
      {dialog.type === 'select' && (
        <Modal>
          <SelectDialog
            title={dialog.title}
            items={dialog.items}
            onSelect={dialog.onSelect}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {dialog.type === 'filepicker' && (
        <Modal>
          <FilePicker
            title={dialog.title}
            files={dialog.files}
            onSelect={dialog.onSelect}
            onCancel={() => setDialog({ type: 'none' })}
            emptyMessage="No saved plans found. Save a plan first using 's' key."
          />
        </Modal>
      )}
      {dialog.type === 'confirm' && (
        <Modal>
          <ConfirmDialog
            title={dialog.title}
            message={dialog.message}
            onConfirm={dialog.onConfirm}
          />
        </Modal>
      )}
    </Box>
  );
};
