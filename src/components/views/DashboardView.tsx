/**
 * DashboardView Component
 * Main interactive dashboard with subnet management
 */

import fs from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useMemo, useState } from 'react';
import type { AutoFitResult } from '../../core/calculators/auto-fit.js';
import { autoFitSubnets } from '../../core/calculators/auto-fit.js';
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
import { useAutoSave } from '../../hooks/useAutoSave.js';
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
import { usePlanStore } from '../../store/planStore.js';
import { usePreferencesStore } from '../../store/preferencesStore.js';
import type { SortColumn } from '../../store/uiStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { colors } from '../../themes/colors.js';
import type { AvailableBlock } from '../../utils/block-parser.js';
import { getErrorMessage, isErrnoException } from '../../utils/error-helpers.js';
import { parseDeviceCount, parseVlanId } from '../../utils/input-helpers.js';
import { unescapeShellPath } from '../../utils/path-helpers.js';
import { sortSubnets } from '../../utils/subnet-sorters.js';
import { AutoFitPreviewDialog } from '../dialogs/AutoFitPreviewDialog.js';
import { AvailableBlocksDialog } from '../dialogs/AvailableBlocksDialog.js';
import { ColumnConfigDialog } from '../dialogs/ColumnConfigDialog.js';
import { ConfirmDialog } from '../dialogs/ConfirmDialog.js';
import { EditNetworkDialog } from '../dialogs/EditNetworkDialog.js';
import { InputDialog } from '../dialogs/InputDialog.js';
import { Modal } from '../dialogs/Modal.js';
import { ModifyDialog } from '../dialogs/ModifyDialog.js';
import { SaveOptionsDialog } from '../dialogs/SaveOptionsDialog.js';
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
      helperText?: string;
      defaultValue?: string;
      onSubmit: (value: string) => void;
      validate?: (value: string) => boolean | string;
      allowedChars?: RegExp;
      preprocessInput?: (value: string) => string;
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
  | { type: 'export-filename'; format: string; directoryPath?: string }
  | { type: 'preferences-menu' }
  | { type: 'preferences-growth' }
  | { type: 'preferences-base-ip' }
  | { type: 'preferences-directories' }
  | { type: 'preferences-saved-dir' }
  | { type: 'preferences-exports-dir' }
  | { type: 'preferences-save-options' }
  | { type: 'preferences-columns' }
  | { type: 'preferences-continue' }
  | { type: 'mod-menu' }
  | { type: 'edit-network' }
  | { type: 'auto-fit-blocks' }
  | {
      type: 'auto-fit-preview';
      result: AutoFitResult;
      blocks: AvailableBlock[];
    };

export const DashboardView: React.FC = () => {
  const { exit } = useApp();
  const plan = usePlan();
  const subnets = useSubnets();
  const currentFilename = usePlanStore.use.currentFilename();
  const setCurrentFilename = usePlanStore.use.setCurrentFilename();
  const {
    addSubnet,
    updateSubnet,
    removeSubnet,
    calculatePlan,
    loadPlan,
    setGrowthPercentage,
    setManualNetworkAddress,
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

  // Apply sorting to subnets (memoized to prevent unnecessary re-sorting)
  const sortedSubnets = useMemo(
    () => sortSubnets(subnets, sortColumn, sortDirection),
    [subnets, sortColumn, sortDirection],
  );

  // Auto-save plan when changes are detected (if enabled in preferences)
  useAutoSave({
    plan,
    currentFilename,
    fileService,
    onError: (error) => {
      notify.error(`Auto-save failed: ${error.message}`);
    },
    onSuccess: () => {
      notify.success('Plan auto-saved', 'low');
    },
  });

  // Reset header selection when visible columns change
  useEffect(() => {
    if (selectedHeaderIndex >= columns.length) {
      setSelectedHeaderIndex(Math.max(0, columns.length - 1));
    }
  }, [columns.length, selectedHeaderIndex]);

  // Reset selected index when sorted subnets array changes
  useEffect(() => {
    if (selectedIndex >= sortedSubnets.length && sortedSubnets.length > 0) {
      setSelectedIndex(sortedSubnets.length - 1);
    } else if (sortedSubnets.length === 0) {
      setSelectedIndex(0);
    }
  }, [sortedSubnets.length, selectedIndex, setSelectedIndex]);

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
      message: `Delete "${subnet.name}" (VLAN ${subnet.vlanId})?

This cannot be undone.`,
      onConfirm: (confirmed) => {
        if (confirmed) {
          const removed = removeSubnet(originalIndex);
          if (removed) {
            // selectedIndex will be automatically adjusted by the useEffect hook
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

  const handleModManualEdit = (): void => {
    setDialog({ type: 'edit-network' });
  };

  const handleModAutoFit = (): void => {
    if (!plan || subnets.length === 0) {
      notify.error('Please add at least one subnet before auto-fitting.');
      return;
    }
    setDialog({ type: 'auto-fit-blocks' });
  };

  const handleAutoFitBlocksSubmit = (blocks: AvailableBlock[]): void => {
    if (!plan || subnets.length === 0) {
      notify.error('No subnets to allocate.');
      setDialog({ type: 'none' });
      return;
    }

    // Calculate plan first to get subnet info
    calculatePlan();

    // Filter out subnets without subnetInfo (shouldn't happen after calculate)
    const subnetsWithInfo = plan.subnets.filter((s) => s.subnetInfo !== undefined);

    // Run auto-fit algorithm (will sort by VLAN ID, then size)
    const result = autoFitSubnets(subnetsWithInfo, blocks);

    // Show preview
    setDialog({
      type: 'auto-fit-preview',
      result,
      blocks,
    });
  };

  const handleAutoFitAccept = (result: AutoFitResult): void => {
    if (!plan) {
      notify.error('No plan loaded.');
      setDialog({ type: 'none' });
      return;
    }

    // Apply allocations to subnets
    for (const allocation of result.allocations) {
      const subnet = plan.subnets[allocation.subnetIndex];
      if (subnet) {
        subnet.subnetInfo = allocation.subnetInfo;
        subnet.manualNetworkAddress = allocation.networkAddress;
        subnet.networkLocked = true;
      }
    }

    // Update plan timestamp
    plan.updatedAt = new Date();

    // Recalculate to update supernet
    calculatePlan();

    notify.success(
      `Auto-fit complete! Allocated ${result.allocations.length} subnet(s) and locked them.`,
    );
    setDialog({ type: 'none' });
  };

  const handleSavePlan = (directoryPath?: string): void => {
    if (!plan?.supernet) return;
    // Use current filename if available, otherwise "untitled"
    const baseName = currentFilename ? currentFilename.replace(/\.(cidr|json)$/, '') : 'untitled';
    const defaultFilename = directoryPath ? baseName : `${baseName}.cidr`;
    const label = directoryPath
      ? `Filename (empty = ${baseName}):`
      : `Filename or path (empty = ${defaultFilename}):`;
    const helperText = directoryPath ? `Will save to: ${directoryPath}` : undefined;

    setDialog({
      type: 'input',
      title: 'Save Plan',
      label,
      helperText,
      defaultValue: '', // Start with empty input
      preprocessInput: unescapeShellPath,
      onSubmit: (filename) => {
        // Use default filename if user submitted empty
        const finalFilename = filename.trim() || defaultFilename;
        (async (): Promise<void> => {
          setDialog({ type: 'loading', message: 'Saving plan...' });
          try {
            // If we have a directory path, auto-add .cidr extension if not present
            let filenameWithExt = finalFilename;
            if (
              directoryPath &&
              !finalFilename.endsWith('.cidr') &&
              !finalFilename.endsWith('.json')
            ) {
              filenameWithExt = `${finalFilename}.cidr`;
            }

            // If we have a directory path, join it with the filename
            const finalPath = directoryPath
              ? `${directoryPath}/${filenameWithExt}`
              : filenameWithExt;

            // Check if user entered a directory (no extension and exists as directory)
            if (!directoryPath) {
              try {
                const stats = fs.statSync(finalPath);
                if (stats.isDirectory()) {
                  notify.info('Please enter a filename for this directory');
                  handleSavePlan(finalPath); // Recurse with directory path
                  return;
                }
              } catch (error) {
                // Path doesn't exist or is not accessible, continue with save
                if (isErrnoException(error) && error.code !== 'ENOENT') {
                  throw error;
                }
              }
            }

            const filepath = await repository.save(plan, finalPath);

            // Update plan name to match saved filename (without extension)
            const savedFilename = filepath.split('/').pop() ?? finalPath;
            const planName = savedFilename.replace(/\.(cidr|json)$/, '');
            plan.name = planName;

            setCurrentFilename(savedFilename); // Track filename for auto-save
            notify.success(`Plan saved to ${filepath}`);
            setDialog({ type: 'none' });
          } catch (error) {
            if (isFileOperationError(error)) {
              notify.error(error.getUserMessage());
            } else {
              notify.error(`Failed to save: ${getErrorMessage(error)}`);
            }
            // Return to save dialog to allow retry
            handleSavePlan(directoryPath);
          }
        })().catch((error: unknown) => {
          // Catch any unhandled rejections
          notify.error(`Unexpected error: ${getErrorMessage(error)}`);
          setDialog({ type: 'none' });
        });
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
      notify.error(`Failed to list plans: ${getErrorMessage(error)}`);
    }
  };

  const handleLoadCustomPath = (): void => {
    setDialog({
      type: 'input',
      title: 'Load Plan',
      label: 'Filename or path:',
      preprocessInput: unescapeShellPath,
      onSubmit: (filepath: string) => {
        handleLoadSelectedPlan(filepath);
      },
    });
  };

  const handleLoadSelectedPlan = (filepath: string): void => {
    setDialog({ type: 'loading', message: 'Loading plan...' });

    try {
      // Check if path is a directory
      let stats;
      try {
        stats = fs.statSync(filepath);
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ENOENT') {
          notify.error('File not found. Please try a different path.');
          // Return to custom path input instead of closing
          handleLoadCustomPath();
          return;
        }
        throw error;
      }
      if (stats.isDirectory()) {
        // List .cidr and .json files in the directory
        const files = fs
          .readdirSync(filepath)
          .filter((file) => file.endsWith('.cidr') || file.endsWith('.json'))
          .map((file) => ({
            filename: file,
            path: `${filepath}/${file}`,
            modifiedAt: fs.statSync(`${filepath}/${file}`).mtime,
          }));

        if (files.length === 0) {
          notify.error('No .cidr or .json files found in directory. Try a different path.');
          // Return to custom path input instead of closing
          handleLoadCustomPath();
          return;
        }

        // Show file picker with files from this directory
        const filesWithCustomOption: SavedPlanFile[] = [
          ...files,
          {
            filename: '→ Enter custom path...',
            path: '__custom__',
            modifiedAt: new Date(),
          },
        ];

        setDialog({
          type: 'filepicker',
          title: `Load Plan from ${filepath.split('/').pop() ?? filepath}`,
          files: filesWithCustomOption,
          onSelect: (selectedPath: string) => {
            if (selectedPath === '__custom__') {
              handleLoadCustomPath();
            } else {
              handleLoadSelectedPlan(selectedPath);
            }
          },
        });
        return;
      }

      // It's a file - load it
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const loadedPlan = parseNetworkPlan(JSON.parse(fileContent), filepath);

      // Extract filename from path (without extension) for display and auto-save tracking
      const filename = filepath.split('/').pop() ?? filepath;
      const planName = filename.replace(/\.(cidr|json)$/, '');

      // Update plan name to match filename (without extension)
      loadedPlan.name = planName;
      loadPlan(loadedPlan);

      setCurrentFilename(filename);

      notify.success(`Plan "${planName}" loaded successfully!`);
      setDialog({ type: 'none' });
    } catch (error) {
      if (isFileOperationError(error)) {
        notify.error(error.getUserMessage());
      } else {
        notify.error(`Failed to load plan: ${getErrorMessage(error)}`);
      }
      // Return to custom path input to allow retry
      handleLoadCustomPath();
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

  const handleSaveAndCreateNew = (directoryPath?: string): void => {
    if (!plan?.supernet) {
      setDialog({ type: 'new-plan-name' });
      return;
    }

    // Use current filename if available, otherwise "untitled"
    const baseName = currentFilename ? currentFilename.replace(/\.(cidr|json)$/, '') : 'untitled';
    const defaultFilename = `${baseName}.cidr`;
    const label = directoryPath
      ? `Filename (empty = ${baseName}):`
      : `Filename or path (empty = ${defaultFilename}):`;
    const helperText = directoryPath ? `Will save to: ${directoryPath}` : undefined;

    setDialog({
      type: 'input',
      title: 'Save Plan',
      label,
      helperText,
      defaultValue: '',
      onSubmit: (filename) => {
        // Use default filename if user submitted empty
        const finalFilename = filename.trim() || defaultFilename;
        (async (): Promise<void> => {
          setDialog({ type: 'loading', message: 'Saving plan...' });
          try {
            // If we have a directory path, join it with the filename
            const finalPath = directoryPath ? `${directoryPath}/${finalFilename}` : finalFilename;

            // Check if user entered a directory (no extension and exists as directory)
            if (!directoryPath) {
              try {
                const stats = fs.statSync(finalPath);
                if (stats.isDirectory()) {
                  notify.info('Please enter a filename for this directory');
                  handleSaveAndCreateNew(finalPath); // Recurse with directory path
                  return;
                }
              } catch (error) {
                // Path doesn't exist or is not accessible, continue with save
                if (isErrnoException(error) && error.code !== 'ENOENT') {
                  throw error;
                }
              }
            }

            const filepath = await repository.save(plan, finalPath);

            // Update plan name to match saved filename (without extension)
            const savedFilename = filepath.split('/').pop() ?? finalPath;
            const planName = savedFilename.replace(/\.(cidr|json)$/, '');
            plan.name = planName;

            setCurrentFilename(savedFilename); // Track filename for auto-save
            notify.success(`Plan saved to ${filepath}`);
            // Continue to new plan creation
            setDialog({ type: 'new-plan-name' });
          } catch (error) {
            if (isFileOperationError(error)) {
              notify.error(error.getUserMessage());
            } else {
              notify.error(`Failed to save: ${getErrorMessage(error)}`);
            }
            // Return to save dialog to allow retry
            handleSaveAndCreateNew(directoryPath);
          }
        })().catch((error: unknown) => {
          // Catch any unhandled rejections
          notify.error(`Unexpected error: ${getErrorMessage(error)}`);
          setDialog({ type: 'none' });
        });
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
      case 'directories':
        setDialog({ type: 'preferences-directories' });
        break;
      case 'saved-dir':
        setDialog({ type: 'preferences-saved-dir' });
        break;
      case 'exports-dir':
        setDialog({ type: 'preferences-exports-dir' });
        break;
      case 'save-options':
        setDialog({ type: 'preferences-save-options' });
        break;
      case 'columns':
        setDialog({ type: 'preferences-columns' });
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

  const handleExportWithFilename = (
    format: string,
    filename: string,
    directoryPath?: string,
  ): void => {
    if (!plan) {
      setDialog({ type: 'none' });
      return;
    }

    (async (): Promise<void> => {
      setDialog({ type: 'loading', message: 'Exporting plan...' });
      try {
        // If we have a directory path, auto-add extension if not present
        let filenameWithExt = filename;
        if (directoryPath) {
          const extension = `.${format}`;
          if (!filename.endsWith(extension)) {
            filenameWithExt = `${filename}${extension}`;
          }
        }

        // If we have a directory path, join it with the filename
        const finalPath = directoryPath ? `${directoryPath}/${filenameWithExt}` : filenameWithExt;

        // Check if user entered a directory (no extension and exists as directory)
        if (!directoryPath) {
          try {
            const stats = fs.statSync(finalPath);
            if (stats.isDirectory()) {
              notify.info('Please enter a filename for this directory');
              // Recurse with directory path
              setDialog({
                type: 'export-filename',
                format,
                directoryPath: finalPath,
              });
              return;
            }
          } catch (error) {
            // Path doesn't exist or is not accessible, continue with export
            if (isErrnoException(error) && error.code !== 'ENOENT') {
              throw error;
            }
          }
        }

        const exportFormat = format as 'yaml' | 'csv' | 'pdf';
        const filepath = await exportService.export(plan, exportFormat, finalPath, preferences);
        notify.success(`Plan exported to ${filepath}`);
        setDialog({ type: 'none' });
      } catch (error) {
        if (isFileOperationError(error)) {
          notify.error(error.getUserMessage());
        } else {
          notify.error(`Failed to export: ${getErrorMessage(error)}`);
        }
        // Return to filename input dialog on error for retry
        setDialog({
          type: 'export-filename',
          format,
          directoryPath,
        });
      }
    })().catch((error: unknown) => {
      // Catch any unhandled rejections
      notify.error(`Unexpected error: ${getErrorMessage(error)}`);
      setDialog({ type: 'none' });
    });
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
        key: 'm',
        description: 'Mod subnets (manual/auto-fit)',
        handler: (): void => {
          if (plan && subnets.length > 0) setDialog({ type: 'mod-menu' });
        },
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
      {dialog.type === 'info' &&
        ((): React.ReactElement | null => {
          const selectedSubnetData = getSelectedSubnet();
          if (!selectedSubnetData) return null;
          return (
            <Modal>
              <SubnetInfoDialog
                subnet={selectedSubnetData.subnet}
                onClose={() => setDialog({ type: 'none' })}
              />
            </Modal>
          );
        })()}
      {dialog.type === 'edit-network' &&
        ((): React.ReactElement | null => {
          const selectedSubnetData = getSelectedSubnet();
          if (!selectedSubnetData) return null;
          if (!plan) return null;
          return (
            <Modal>
              <EditNetworkDialog
                subnet={selectedSubnetData.subnet}
                baseNetwork={plan.baseIp}
                existingSubnets={subnets}
                onSubmit={(networkAddress, lock) => {
                  const subnetData = getSelectedSubnet();
                  if (!subnetData?.subnet.subnetInfo) return;

                  // Update subnet in store with new network address and lock status
                  setManualNetworkAddress(subnetData.originalIndex, networkAddress, lock);
                  notify.success(
                    `Network address updated to ${networkAddress}${lock ? ' (locked)' : ''}`,
                  );
                  setDialog({ type: 'none' });
                }}
                onCancel={() => setDialog({ type: 'none' })}
              />
            </Modal>
          );
        })()}
      {dialog.type === 'input' && (
        <Modal>
          <InputDialog
            title={dialog.title}
            label={dialog.label}
            helperText={dialog.helperText}
            defaultValue={dialog.defaultValue}
            onSubmit={dialog.onSubmit}
            onCancel={() => setDialog({ type: 'none' })}
            validate={dialog.validate}
            allowedChars={dialog.allowedChars}
            preprocessInput={dialog.preprocessInput}
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
            message={`Save current plan before creating new?

Unsaved changes will be lost.`}
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
              try {
                const newPlan = createNetworkPlan(dialog.name, baseIp);
                loadPlan(newPlan);
                notify.success(`Plan "${dialog.name}" created successfully!`);
                setDialog({ type: 'none' });
              } catch (error) {
                notify.error(`Failed to create plan: ${getErrorMessage(error)}`);
                // Keep dialog open for retry
              }
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
                label: 'Default Directories...',
                value: 'directories',
              },
              {
                label: 'Save Options...',
                value: 'save-options',
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
              (async (): Promise<void> => {
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
                  notify.error(`Failed to save preference: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-menu' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-menu' });
              });
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
              (async (): Promise<void> => {
                try {
                  const updatedPrefs = { ...preferences, baseIp };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(`Default base IP set to ${baseIp}`);
                } catch (error) {
                  notify.error(`Failed to save preference: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-menu' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-menu' });
              });
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
            validate={validateIpAddress}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-directories' && (
        <Modal>
          <SelectDialog
            title="Default Directories"
            items={[
              {
                label: `Saved Plans (${preferences.savedPlansDir ? preferences.savedPlansDir.replace(process.env['HOME'] ?? '', '~') : '~/cidrly/saved-plans'})`,
                value: 'saved-dir',
              },
              {
                label: `Exports (${preferences.exportsDir ? preferences.exportsDir.replace(process.env['HOME'] ?? '', '~') : '~/cidrly/exports'})`,
                value: 'exports-dir',
              },
            ]}
            onSelect={handlePreferenceSelected}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-saved-dir' && (
        <Modal>
          <InputDialog
            title="Saved Plans Directory"
            label="Enter custom directory path (or leave blank for default):"
            defaultValue={preferences.savedPlansDir ?? ''}
            preprocessInput={unescapeShellPath}
            onSubmit={(dir) => {
              (async (): Promise<void> => {
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
                  notify.error(`Failed to save preference: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-directories' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-directories' });
              });
            }}
            onCancel={() => setDialog({ type: 'preferences-directories' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-exports-dir' && (
        <Modal>
          <InputDialog
            title="Exports Directory"
            label="Enter custom directory path (or leave blank for default):"
            defaultValue={preferences.exportsDir ?? ''}
            preprocessInput={unescapeShellPath}
            onSubmit={(dir) => {
              (async (): Promise<void> => {
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
                  notify.error(`Failed to save preference: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-directories' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-directories' });
              });
            }}
            onCancel={() => setDialog({ type: 'preferences-directories' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-save-options' && (
        <Modal>
          <SaveOptionsDialog
            autoSave={preferences.autoSave}
            saveDelay={preferences.saveDelay}
            onSubmit={(autoSave, saveDelay) => {
              (async (): Promise<void> => {
                try {
                  const updatedPrefs = { ...preferences, autoSave, saveDelay };
                  await preferencesService.savePreferences(updatedPrefs);
                  setPreferences(updatedPrefs);
                  handlePreferenceSaved(
                    `Save options updated: Auto-save ${autoSave ? 'enabled' : 'disabled'}, delay ${saveDelay}ms`,
                  );
                } catch (error) {
                  notify.error(`Failed to save preferences: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-menu' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-menu' });
              });
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
              (async (): Promise<void> => {
                try {
                  type ColumnKey =
                    | 'name'
                    | 'vlan'
                    | 'expected'
                    | 'planned'
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
                  notify.error(`Failed to save preference: ${getErrorMessage(error)}`);
                  setDialog({ type: 'preferences-menu' });
                }
              })().catch((error: unknown) => {
                notify.error(`Unexpected error: ${getErrorMessage(error)}`);
                setDialog({ type: 'preferences-menu' });
              });
            }}
            onCancel={() => setDialog({ type: 'preferences-menu' })}
          />
        </Modal>
      )}
      {dialog.type === 'preferences-continue' && (
        <Modal>
          <ConfirmDialog
            title="Preferences"
            message={`Preference saved successfully!

Edit another preference?`}
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
      {dialog.type === 'export-filename' &&
        plan &&
        (() => {
          const defaultName = `${plan.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;
          const defaultWithExt = `${defaultName}.${dialog.format}`;
          return (
            <Modal>
              <InputDialog
                title="Export Plan"
                label={
                  dialog.directoryPath
                    ? `Filename (empty = ${defaultWithExt}):`
                    : `Filename or path (empty = ${defaultWithExt}):`
                }
                helperText={
                  dialog.directoryPath ? `Will export to: ${dialog.directoryPath}` : undefined
                }
                defaultValue=""
                preprocessInput={unescapeShellPath}
                onSubmit={(filename) => {
                  const finalFilename =
                    filename.trim() ||
                    (dialog.directoryPath ? defaultName : `${defaultName}.${dialog.format}`);
                  handleExportWithFilename(dialog.format, finalFilename, dialog.directoryPath);
                }}
                onCancel={() => setDialog({ type: 'export-format-select' })}
              />
            </Modal>
          );
        })()}
      {dialog.type === 'mod-menu' && (
        <Modal>
          <ModifyDialog
            onSelectManualEdit={handleModManualEdit}
            onSelectAutoFit={handleModAutoFit}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {dialog.type === 'auto-fit-blocks' && (
        <Modal>
          <AvailableBlocksDialog
            onSubmit={handleAutoFitBlocksSubmit}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
      {dialog.type === 'auto-fit-preview' && (
        <Modal>
          <AutoFitPreviewDialog
            result={dialog.result}
            onAccept={() => handleAutoFitAccept(dialog.result)}
            onCancel={() => setDialog({ type: 'none' })}
          />
        </Modal>
      )}
    </Box>
  );
};
