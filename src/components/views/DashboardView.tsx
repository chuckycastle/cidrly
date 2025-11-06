/**
 * DashboardView Component
 * Main interactive dashboard with subnet management
 */

import fs from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import { createNetworkPlan, createSubnet } from '../../core/models/network-plan.js';
import {
  validateDeviceCount,
  validateIpAddress,
  validatePlanName,
  validateSubnetDescription,
  validateSubnetName,
  validateVlanId,
} from '../../core/validators/validators.js';
import { isFileOperationError } from '../../errors/index.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { usePlan, usePlanActions, useSubnets } from '../../hooks/usePlan.js';
import { useNotify, useSelection } from '../../hooks/useUI.js';
import { getDirectory } from '../../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../../repositories/index.js';
import { parseNetworkPlan } from '../../schemas/network-plan.schema.js';
import { ExportService } from '../../services/export.service.js';
import type { SavedPlanFile } from '../../services/file.service.js';
import { FileService } from '../../services/file.service.js';
import { PreferencesService } from '../../services/preferences.service.js';
import { usePreferencesStore } from '../../store/preferencesStore.js';
import type { SortColumn } from '../../store/uiStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { colors } from '../../themes/colors.js';
import { parseDeviceCount, parseVlanId } from '../../utils/input-helpers.js';
import { sortSubnets } from '../../utils/subnet-sorters.js';
import { ColumnConfigDialog } from '../dialogs/ColumnConfigDialog.js';
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
  | { type: 'new-plan-ip'; name: string }
  | { type: 'export-format-select' }
  | { type: 'export-filename'; format: string }
  | { type: 'preferences-menu' }
  | { type: 'preferences-growth' }
  | { type: 'preferences-base-ip' }
  | { type: 'preferences-saved-dir' }
  | { type: 'preferences-exports-dir' }
  | { type: 'preferences-columns' }
  | { type: 'preferences-continue' };

export const DashboardView: React.FC = () => {
  const { exit } = useApp();
  const plan = usePlan();
  const subnets = useSubnets();
  const { addSubnet, updateSubnet, removeSubnet, calculatePlan, loadPlan, setGrowthPercentage } =
    usePlanActions();
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

  // Preferences store
  const preferences = usePreferencesStore.use.preferences();
  const setPreferences = usePreferencesStore.use.setPreferences();

  // Header mode state
  const [headerMode, setHeaderMode] = useState(false);
  const [selectedHeaderIndex, setSelectedHeaderIndex] = useState(0);

  const [dialog, setDialog] = useState<DialogType>({ type: 'none' });

  const fileService = new FileService(getDirectory('saved', preferences.savedPlansDir));
  const repository = new FileSystemRepository(fileService);
  const exportService = new ExportService(getDirectory('exports', preferences.exportsDir));
  const preferencesService = new PreferencesService();

  // Get visible columns in the user-defined order
  const allColumnKeys: SortColumn[] = [
    'name',
    'vlan',
    'expected',
    'planned',
    'cidr',
    'usable',
    'network',
    'description',
  ];
  const visibleSet = new Set(preferences.columnPreferences.visibleColumns);
  const columns: SortColumn[] = preferences.columnPreferences.columnOrder.filter(
    (col): col is SortColumn =>
      allColumnKeys.includes(col as SortColumn) &&
      (col === 'name' || visibleSet.has(col as SortColumn)),
  );

  // Apply sorting to subnets
  const sortedSubnets = sortSubnets(subnets, sortColumn, sortDirection);

  // Reset header selection when visible columns change
  useEffect(() => {
    if (selectedHeaderIndex >= columns.length) {
      setSelectedHeaderIndex(Math.max(0, columns.length - 1));
    }
  }, [columns.length, selectedHeaderIndex]);

  // Helper to get the selected subnet from sorted array and find its original index
  const getSelectedSubnet = (): {
    subnet: (typeof subnets)[number];
    originalIndex: number;
  } | null => {
    const selectedSubnet = sortedSubnets[selectedIndex];
    if (!selectedSubnet) return null;
    const originalIndex = subnets.findIndex((s) => s.id === selectedSubnet.id);
    if (originalIndex === -1) return null;
    return { subnet: selectedSubnet, originalIndex };
  };

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
    const selected = getSelectedSubnet();
    if (!selected) {
      notify.error('No subnet selected');
      return;
    }
    if (!selected.subnet.subnetInfo) {
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
                setDialog({
                  type: 'input',
                  title: 'Add Subnet',
                  label: 'Enter description (optional, press Enter to skip):',
                  onSubmit: (description) => {
                    const vlanId = parseVlanId(vlanIdStr);
                    const expectedDevices = parseDeviceCount(expectedDevicesStr);
                    const trimmedDescription = description.trim();
                    const subnet = createSubnet(
                      name,
                      vlanId,
                      expectedDevices,
                      trimmedDescription || undefined,
                    );
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
                  validate: validateSubnetDescription,
                });
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
    const selected = getSelectedSubnet();
    if (!selected) {
      notify.error('No subnet selected');
      return;
    }
    const { subnet, originalIndex } = selected;
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
                setDialog({
                  type: 'input',
                  title: 'Edit Subnet',
                  label: 'Enter description (optional, press Enter to skip):',
                  defaultValue: subnet.description ?? '',
                  onSubmit: (description) => {
                    const trimmedDescription = description.trim();
                    updateSubnet(
                      originalIndex,
                      name,
                      parseVlanId(vlanIdStr),
                      parseDeviceCount(expectedDevicesStr),
                      trimmedDescription ? trimmedDescription : undefined,
                    );
                    notify.success(`Subnet "${name}" updated successfully!`);
                    setDialog({ type: 'none' });
                  },
                  validate: validateSubnetDescription,
                });
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
    const selected = getSelectedSubnet();
    if (!selected) {
      notify.error('No subnet selected');
      return;
    }
    const { subnet, originalIndex } = selected;
    setDialog({
      type: 'confirm',
      title: 'Delete Subnet',
      message: `Delete "${subnet.name}" (VLAN ${subnet.vlanId})?\n\nThis cannot be undone.`,
      onConfirm: (confirmed) => {
        if (confirmed) {
          const removed = removeSubnet(originalIndex);
          if (removed) {
            // Adjust selected index in sorted view
            if (sortedSubnets.length === 0) {
              setSelectedIndex(0);
            } else if (selectedIndex >= sortedSubnets.length) {
              setSelectedIndex(sortedSubnets.length - 1);
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
    setDialog({ type: 'preferences-menu' });
  };

  const handlePreferenceSelected = (preference: string): void => {
    switch (preference) {
      case 'growth':
        setDialog({ type: 'preferences-growth' });
        break;
      case 'base-ip':
        setDialog({ type: 'preferences-base-ip' });
        break;
      case 'saved-dir':
        setDialog({ type: 'preferences-saved-dir' });
        break;
      case 'columns':
        setDialog({ type: 'preferences-columns' });
        break;
      case 'exports-dir':
        setDialog({ type: 'preferences-exports-dir' });
        break;
    }
  };

  const handlePreferenceSaved = (message: string): void => {
    notify.success(message);
    setDialog({ type: 'preferences-continue' });
  };

  const handleExport = (): void => {
    if (!plan?.supernet) {
      notify.error('No calculated plan to export');
      return;
    }
    // Open format selection dialog
    setDialog({ type: 'export-format-select' });
  };

  const handleExportFormatSelected = (format: string): void => {
    if (!plan) {
      setDialog({ type: 'none' });
      return;
    }
    // Open filename input dialog
    setDialog({
      type: 'export-filename',
      format,
    });
  };

  const handleExportWithFilename = (format: string, filename: string): void => {
    if (!plan) {
      setDialog({ type: 'none' });
      return;
    }

    void (async (): Promise<void> => {
      setDialog({ type: 'loading', message: 'Exporting plan...' });
      try {
        const exportFormat = format as 'yaml' | 'csv' | 'pdf';
        const filepath = await exportService.export(plan, exportFormat, filename, preferences);
        notify.success(`Plan exported to ${filepath}`);
        setDialog({ type: 'none' });
      } catch (error) {
        if (isFileOperationError(error)) {
          notify.error(error.getUserMessage());
        } else {
          notify.error(
            `Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
        setDialog({ type: 'none' });
      }
    })();
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
      // T: Toggle header mode (alternative to tab)
      {
        key: 't',
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
          if (plan) {
            if (!headerMode && selectedIndex === 0) {
              // At top of table, enter header mode
              setHeaderMode(true);
            } else if (!headerMode) {
              moveUp();
            }
          }
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
          if (plan) {
            if (headerMode) {
              // In header mode, exit to table mode (select first row)
              setHeaderMode(false);
              setSelectedIndex(0);
            } else {
              moveDown();
            }
          }
        },
        category: 'navigation',
        enabled: true, // Now enabled in both modes
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
        key: ' ',
        description: 'Activate sort on selected column (Space)',
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
      {
        key: 'x',
        description: 'Export plan',
        handler: handleExport,
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
          visibleColumns={preferences.columnPreferences.visibleColumns}
          columnOrder={preferences.columnPreferences.columnOrder}
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
      {dialog.type === 'info' && sortedSubnets[selectedIndex] && (
        <Modal>
          <SubnetInfoDialog
            subnet={sortedSubnets[selectedIndex]}
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
            defaultValue={preferences.baseIp}
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
      {dialog.type === 'preferences-menu' && (
        <Modal>
          <SelectDialog
            title="Preferences"
            items={[
              {
                label: `Growth Percentage (${preferences.growthPercentage}%)`,
                value: 'growth',
              },
              { label: `Base IP (${preferences.baseIp})`, value: 'base-ip' },
              {
                label: `Saved Plans Dir (${preferences.savedPlansDir ? preferences.savedPlansDir.replace(process.env['HOME'] ?? '', '~') : '~/cidrly/saved-plans'})`,
                value: 'saved-dir',
              },
              {
                label: `Exports Dir (${preferences.exportsDir ? preferences.exportsDir.replace(process.env['HOME'] ?? '', '~') : '~/cidrly/exports'})`,
                value: 'exports-dir',
              },
              {
                label: 'Configure Columns',
                value: 'columns',
              },
            ]}
            onSelect={handlePreferenceSelected}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-growth' && (
        <Modal>
          <InputDialog
            title="Growth Percentage"
            label="Enter growth percentage (0-300%):"
            defaultValue={preferences.growthPercentage.toString()}
            onSubmit={(value) => {
              const growthPercentage = parseInt(value, 10);
              void (async (): Promise<void> => {
                try {
                  const updatedPrefs = { ...preferences, growthPercentage };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  if (plan) {
                    setGrowthPercentage(growthPercentage);
                  }
                  handlePreferenceSaved(
                    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
                    `Growth percentage set to ${growthPercentage}%${plan && subnets.length > 0 ? ' - Plan recalculated' : ''}`,
                  );
                } catch (error) {
                  notify.error(
                    `Failed to save preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                  setDialog({ type: 'preferences-menu' });
                }
              })();
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
            validate={(value) => {
              const num = parseInt(value, 10);
              if (isNaN(num)) return 'Must be a number';
              if (num < 0) return 'Must be at least 0';
              if (num > 300) return 'Cannot exceed 300';
              return true;
            }}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-base-ip' && (
        <Modal>
          <InputDialog
            title="Default Base IP"
            label="Enter default base IP for new plans:"
            defaultValue={preferences.baseIp}
            allowedChars={/[0-9.]/}
            onSubmit={(baseIp) => {
              void (async (): Promise<void> => {
                try {
                  const updatedPrefs = { ...preferences, baseIp };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(`Default base IP set to ${baseIp}`);
                } catch (error) {
                  notify.error(
                    `Failed to save preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                  setDialog({ type: 'preferences-menu' });
                }
              })();
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
            validate={validateIpAddress}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-saved-dir' && (
        <Modal>
          <InputDialog
            title="Saved Plans Directory"
            label="Enter custom directory path (or leave blank for default):"
            defaultValue={preferences.savedPlansDir ?? ''}
            onSubmit={(dir) => {
              void (async (): Promise<void> => {
                try {
                  const updatedPrefs = {
                    ...preferences,
                    savedPlansDir: dir.trim() || undefined,
                  };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(
                    `Saved plans directory ${dir.trim() ? `set to ${dir}` : 'reset to default'}`,
                  );
                } catch (error) {
                  notify.error(
                    `Failed to save preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                  setDialog({ type: 'preferences-menu' });
                }
              })();
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-exports-dir' && (
        <Modal>
          <InputDialog
            title="Exports Directory"
            label="Enter custom directory path (or leave blank for default):"
            defaultValue={preferences.exportsDir ?? ''}
            onSubmit={(dir) => {
              void (async (): Promise<void> => {
                try {
                  const updatedPrefs = {
                    ...preferences,
                    exportsDir: dir.trim() || undefined,
                  };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(
                    `Exports directory ${dir.trim() ? `set to ${dir}` : 'reset to default'}`,
                  );
                } catch (error) {
                  notify.error(
                    `Failed to save preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                  setDialog({ type: 'preferences-menu' });
                }
              })();
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-columns' && (
        <Modal>
          <ColumnConfigDialog
            visibleColumns={preferences.columnPreferences.visibleColumns}
            columnOrder={preferences.columnPreferences.columnOrder}
            onSave={(visibleColumns, columnOrder) => {
              void (async (): Promise<void> => {
                try {
                  type ColumnKey =
                    | 'name'
                    | 'vlan'
                    | 'expected'
                    | 'planned'
                    | 'cidr'
                    | 'usable'
                    | 'network'
                    | 'description';
                  const updatedPrefs = {
                    ...preferences,
                    columnPreferences: {
                      ...preferences.columnPreferences,
                      visibleColumns: visibleColumns as ColumnKey[],
                      columnOrder,
                    },
                  };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(
                    `Column configuration updated (${visibleColumns.length} columns visible)`,
                  );
                } catch (error) {
                  notify.error(
                    `Failed to save preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  );
                  setDialog({ type: 'preferences-menu' });
                }
              })();
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-continue' && (
        <Modal>
          <ConfirmDialog
            title="Preferences"
            message="Preference saved successfully!\n\nEdit another preference?"
            onConfirm={(result) => {
              if (result) {
                setDialog({ type: 'preferences-menu' });
              } else {
                setDialog({ type: 'none' });
              }
            }}
          />
        </Modal>
      )}
      {dialog.type === 'export-format-select' && (
        <Modal>
          <SelectDialog
            title="Export Plan"
            items={[
              { label: 'YAML', value: 'yaml' },
              { label: 'CSV', value: 'csv' },
              { label: 'PDF', value: 'pdf' },
            ]}
            onSelect={handleExportFormatSelected}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {dialog.type === 'export-filename' && plan && (
        <Modal>
          <InputDialog
            title="Export Plan"
            label="Filename:"
            defaultValue={`${plan.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${dialog.format}`}
            onSubmit={(filename) => handleExportWithFilename(dialog.format, filename)}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
    </Box>
  );
};
