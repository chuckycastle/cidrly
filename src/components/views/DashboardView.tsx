/**
 * DashboardView Component
 * Main interactive dashboard with subnet management
 */

import fs from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React, { useState } from 'react';
import { createNetworkPlan, createSubnet } from '../../core/models/network-plan.js';
import {
  validateDeviceCount,
  validateIpAddress,
  validatePlanName,
  validateSubnetName,
  validateVlanId,
} from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { usePlan, usePlanActions, useSubnets } from '../../hooks/usePlan.js';
import { useNotify, useSelection } from '../../hooks/useUI.js';
import { FILE_RULES } from '../../infrastructure/config/validation-rules.js';
import type { SortColumn } from '../../store/uiStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { sortSubnets } from '../../utils/subnet-sorters.js';
import { FileSystemRepository } from '../../repositories/index.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import type { SavedPlanFile } from '../../services/file.service.js';
import { FileService } from '../../services/file.service.js';
import { colors } from '../../themes/colors.js';
import { parseDeviceCount, parseVlanId } from '../../utils/input-helpers.js';
import { ConfirmDialog } from '../dialogs/ConfirmDialog.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { Modal } from '../dialogs/Modal.js';
import { PreferencesDialog } from '../dialogs/PreferencesDialog.js';
import { SelectDialog } from '../dialogs/SelectDialog.js';
import { SubnetInfoDialog } from '../dialogs/SubnetInfoDialog.js';
import { FilePicker } from '../widgets/FilePicker.js';
import { SubnetTable } from '../widgets/SubnetTable.js';

type DialogType =
  | { type: 'none' }
  | { type: 'info' }
  | { type: 'preferences' }
  | { type: 'loading'; message: string }
  | {
      type: 'input';
      title: string;
      label: string;
      defaultValue?: string;
      onSubmit: (value: string) => void;
      validate?: (value: string) => boolean | string;
      allowedChars?: RegExp;
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
  | { type: 'confirm'; title: string; message: string; onConfirm: (result: boolean) => void }
  | { type: 'new-plan-confirm' }
  | { type: 'new-plan-name' }
  | { type: 'new-plan-ip'; name: string };

export const DashboardView: React.FC = () => {
  const { exit } = useApp();
  const plan = usePlan();
  const subnets = useSubnets();
  const {
    addSubnet,
    updateSubnet,
    removeSubnet,
    calculatePlan,
    updateBaseIp,
    loadPlan,
    setGrowthPercentage,
  } = usePlanActions();
  const notify = useNotify();
  const {
    selectedIndex,
    select: setSelectedIndex,
    moveUp,
    moveDown,
  } = useSelection(subnets.length - 1);

  // Sort state from UI store
  const sortColumn = useUIStore.use.sortColumn();
  const sortDirection = useUIStore.use.sortDirection();
  const setSortColumn = useUIStore.use.setSortColumn();

  // Header mode state
  const [headerMode, setHeaderMode] = useState(false);
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState(0);

  const [dialog, setDialog] = useState<DialogType>({ type: 'none' });

  const fileService = new FileService(path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR));
  const repository = new FileSystemRepository(fileService);

  // Column definitions (matching SubnetTable)
  const columns: SortColumn[] = ['name', 'vlan', 'expected', 'planned', 'cidr', 'usable', 'network'];

  // Apply sorting to subnets
  const sortedSubnets = sortSubnets(subnets, sortColumn, sortDirection);

  // Header mode navigation handlers
  const moveHeaderLeft = (): void => {
    setSelectedHeaderIndex((prev) => Math.max(0, prev - 1));
  };

  const moveHeaderRight = (): void => {
    setSelectedHeaderIndex((prev) => Math.min(columns.length - 1, prev + 1));
  };

  const activateSort = (): void => {
    const column = columns[selectedHeaderIndex];
    if (column) {
      setSortColumn(column);
      notify.info(`Sorted by ${column} ${sortDirection === 'asc' ? '↑' : '↓'}`);
    }
  };

  const toggleHeaderMode = (): void => {
    setHeaderMode((prev) => !prev);
    if (!headerMode) {
      notify.info('Header mode: Use ← → to navigate, Enter to sort, Tab/Esc to exit');
    }
  };

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
                if (plan) {
                  const plannedDevices = Math.ceil(
                    expectedDevices * (1 + plan.growthPercentage / 100),
                  );
                  notify.success(
                    `Subnet "${name}" added! (Planning for ${plannedDevices} devices with ${plan.growthPercentage}% growth)`,
                  );
                }
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
      allowedChars: /[0-9.]/,
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

  const handleNewPlan = (): void => {
    if (plan?.supernet) {
      // Has calculated plan - offer to save
      setDialog({ type: 'new-plan-confirm' });
    } else {
      // No work to save - go straight to name input
      setDialog({ type: 'new-plan-name' });
    }
  };

  const handleSaveAndCreateNew = (): void => {
    if (!plan?.supernet) {
      setDialog({ type: 'new-plan-name' });
      return;
    }

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
            // Continue to new plan creation
            setDialog({ type: 'new-plan-name' });
          } catch (error) {
            if (isFileOperationError(error)) {
              notify.error(error.getUserMessage());
            } else {
              notify.error(
                `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
            setDialog({ type: 'none' });
          }
        })();
      },
    });
  };

  const handleOpenPreferences = (): void => {
    setDialog({ type: 'preferences' });
  };

  const handleSavePreferences = (growthPercentage: number): void => {
    if (!plan) {
      notify.error('No plan loaded');
      setDialog({ type: 'none' });
      return;
    }

    // Update plan's growth percentage and recalculate if subnets exist
    setGrowthPercentage(growthPercentage);

    if (subnets.length > 0) {
      notify.success(`Growth percentage set to ${growthPercentage}% - Plan recalculated`);
    } else {
      notify.success(`Growth percentage set to ${growthPercentage}%`);
    }

    setDialog({ type: 'none' });
  };

  // Keyboard shortcuts configuration
  useKeyboardShortcuts({
    shortcuts: [
      // Tab: Toggle header mode
      {
        key: 'tab',
        description: 'Toggle header/row mode',
        handler: (): void => {
          if (plan && subnets.length > 0) toggleHeaderMode();
        },
        category: 'navigation',
        enabled: subnets.length > 0,
      },
      // Navigation - Up/Down (row mode only)
      {
        key: 'upArrow',
        description: 'Move selection up',
        handler: (): void => {
          if (plan && !headerMode) moveUp();
        },
        category: 'navigation',
        enabled: !headerMode,
      },
      {
        key: 'k',
        description: 'Move selection up (vim)',
        handler: (): void => {
          if (plan && !headerMode) moveUp();
        },
        category: 'navigation',
        enabled: !headerMode,
      },
      {
        key: 'downArrow',
        description: 'Move selection down',
        handler: (): void => {
          if (plan && !headerMode) moveDown();
        },
        category: 'navigation',
        enabled: !headerMode,
      },
      {
        key: 'j',
        description: 'Move selection down (vim)',
        handler: (): void => {
          if (plan && !headerMode) moveDown();
        },
        category: 'navigation',
        enabled: !headerMode,
      },
      // Navigation - Left/Right (header mode only)
      {
        key: 'leftArrow',
        description: 'Move header selection left',
        handler: (): void => {
          if (plan && headerMode) moveHeaderLeft();
        },
        category: 'navigation',
        enabled: headerMode,
      },
      {
        key: 'h',
        description: 'Move header selection left (vim)',
        handler: (): void => {
          if (plan && headerMode) moveHeaderLeft();
        },
        category: 'navigation',
        enabled: headerMode,
      },
      {
        key: 'rightArrow',
        description: 'Move header selection right',
        handler: (): void => {
          if (plan && headerMode) moveHeaderRight();
        },
        category: 'navigation',
        enabled: headerMode,
      },
      // Enter: Dual-purpose (row mode = details, header mode = sort)
      {
        key: 'return',
        description: 'Show subnet details (row mode) / Sort column (header mode)',
        handler: (): void => {
          if (!plan || subnets.length === 0) return;
          if (headerMode) {
            activateSort();
          } else {
            handleShowSubnetDetails();
          }
        },
        category: 'actions',
        enabled: subnets.length > 0,
      },
      {
        key: 'space',
        description: 'Activate sort on selected column',
        handler: (): void => {
          if (plan && headerMode) activateSort();
        },
        category: 'actions',
        enabled: headerMode,
      },
      // Escape from header mode
      {
        key: 'escape',
        description: 'Exit header mode',
        handler: (): void => {
          if (headerMode) {
            setHeaderMode(false);
            notify.info('Exited header mode');
          }
        },
        category: 'navigation',
        enabled: headerMode,
      },
      // Actions (row mode only)
      {
        key: 'i',
        description: 'Show subnet details',
        handler: (): void => {
          if (plan && subnets.length > 0 && !headerMode) handleShowSubnetDetails();
        },
        category: 'actions',
        enabled: subnets.length > 0 && !headerMode,
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
        key: 'd',
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
      // 'l' key: Dual-purpose (row mode = load, header mode = vim right)
      {
        key: 'l',
        description: 'Load plan (row mode) / Move right (header mode)',
        handler: (): void => {
          if (headerMode) {
            if (plan) moveHeaderRight();
          } else {
            void handleLoadPlan();
          }
        },
        category: 'actions',
      },
      {
        key: 'n',
        description: 'Create new plan',
        handler: handleNewPlan,
        category: 'actions',
      },
      {
        key: 'p',
        description: 'Open preferences',
        handler: handleOpenPreferences,
        category: 'actions',
      },
      {
        key: 'b',
        description: 'Change base IP address',
        handler: handleChangeBaseIp,
        category: 'actions',
      },
      // 'q' key: Multi-purpose (quit / exit header mode / close dialogs)
      {
        key: 'q',
        description: 'Quit / Exit header mode / Close dialog',
        handler: (): void => {
          // Close non-text-input dialogs (input dialogs excluded to allow typing 'q')
          const closeableDialogs = [
            'info',
            'confirm',
            'new-plan-confirm',
            'preferences',
            'filepicker',
            'select',
          ];
          if (closeableDialogs.includes(dialog.type)) {
            setDialog({ type: 'none' });
            return;
          }

          // Exit header mode if active
          if (headerMode) {
            setHeaderMode(false);
            setSelectedHeaderIndex(0);
            return;
          }

          // Otherwise quit the app
          exit();
        },
        category: 'system',
      },
    ],
    enabled:
      dialog.type === 'none' ||
      ['info', 'confirm', 'new-plan-confirm', 'preferences', 'filepicker', 'select'].includes(
        dialog.type,
      ),
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
      {dialog.type === 'none' && (
        <SubnetTable
          subnets={sortedSubnets}
          selectedIndex={selectedIndex}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          headerMode={headerMode}
          selectedHeaderIndex={selectedHeaderIndex}
        />
      )}

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
            allowedChars={dialog.allowedChars}
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
      {dialog.type === 'new-plan-confirm' && (
        <Modal>
          <ConfirmDialog
            title="Create New Plan"
            message="Save current plan before creating new?\n\nUnsaved changes will be lost."
            onConfirm={(shouldSave) => {
              if (shouldSave) {
                handleSaveAndCreateNew();
              } else {
                setDialog({ type: 'new-plan-name' });
              }
            }}
          />
        </Modal>
      )}
      {dialog.type === 'new-plan-name' && (
        <Modal>
          <InputDialog
            title="Create New Plan"
            label="Plan name:"
            onSubmit={(name) => {
              setDialog({ type: 'new-plan-ip', name });
            }}
            onCancel={() => setDialog({ type: 'none' })}
            validate={validatePlanName}
          />
        </Modal>
      )}
      {dialog.type === 'new-plan-ip' && (
        <Modal>
          <InputDialog
            title="Create New Plan"
            label="Base IP address:"
            defaultValue="10.0.0.0"
            onSubmit={(baseIp) => {
              const newPlan = createNetworkPlan(dialog.name, baseIp);
              loadPlan(newPlan);
              notify.success(`Plan "${dialog.name}" created successfully!`);
              setDialog({ type: 'none' });
            }}
            onCancel={() => setDialog({ type: 'new-plan-name' })}
            validate={validateIpAddress}
          />
        </Modal>
      )}
      {dialog.type === 'preferences' && plan && (
        <Modal>
          <PreferencesDialog
            currentGrowthPercentage={plan.growthPercentage}
            onSubmit={handleSavePreferences}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
    </Box>
  );
};
