/**
 * SubnetTable Component
 * Modern data grid with clean styling and subtle selection
 */

import { Box, Text } from 'ink';
import React from 'react';
import type { Subnet } from '../../core/models/network-plan.js';
import { useTerminalWidth } from '../../hooks/useTerminalWidth.js';
import type { SortColumn, SortDirection } from '../../store/uiStore.js';
import { colors, symbols } from '../../themes/colors.js';

export interface SubnetTableProps {
  subnets: Subnet[];
  selectedIndex: number;
  sortColumn?: SortColumn | null;
  sortDirection?: SortDirection;
  headerMode?: boolean;
  selectedHeaderIndex?: number;
  visibleColumns?: string[];
  columnOrder?: string[];
  viewportStart?: number;
  viewportSize?: number;
}

export const SubnetTable: React.FC<SubnetTableProps> = React.memo(
  ({
    subnets,
    selectedIndex,
    sortColumn = null,
    sortDirection = 'asc',
    headerMode = false,
    selectedHeaderIndex = 0,
    visibleColumns,
    columnOrder,
    viewportStart = 0,
    viewportSize = 12,
  }) => {
    const terminalWidth = useTerminalWidth();

    // Base column widths (reduced to fit 106x31 terminal)
    const baseColumns: Array<{
      key: SortColumn;
      label: string;
      width: number;
      minWidth: number; // Minimum width
      flexible: boolean; // Can grow with available space
      align: 'left' | 'right';
    }> = [
      { key: 'name', label: 'Name', width: 17, minWidth: 10, flexible: true, align: 'left' },
      { key: 'vlan', label: 'VLAN', width: 4, minWidth: 4, flexible: false, align: 'right' },
      { key: 'expected', label: 'Exp', width: 3, minWidth: 3, flexible: false, align: 'right' },
      { key: 'planned', label: 'Plan', width: 4, minWidth: 4, flexible: false, align: 'right' },
      { key: 'usable', label: 'Cap', width: 4, minWidth: 4, flexible: false, align: 'right' },
      { key: 'network', label: 'Network', width: 19, minWidth: 19, flexible: false, align: 'left' },
      {
        key: 'description',
        label: 'Description',
        width: 30,
        minWidth: 10,
        flexible: true,
        align: 'left',
      },
    ];

    // Filter columns based on preferences
    const filteredColumns =
      columnOrder && visibleColumns
        ? columnOrder
            .filter((key) => key === 'name' || visibleColumns.includes(key))
            .map((key) => baseColumns.find((col) => col.key === key))
            .filter((col): col is NonNullable<typeof col> => col !== undefined)
        : visibleColumns
          ? baseColumns.filter((col) => col.key === 'name' || visibleColumns.includes(col.key))
          : baseColumns;

    // Calculate dynamic widths based on visible columns
    const columns = React.useMemo(() => {
      // Calculate total fixed width (non-flexible columns + row prefix + dividers)
      const rowPrefix = 1 + 1 + 2 + 3; // selector + space + row# + divider
      const dividerWidth = (filteredColumns.length - 1) * 3; // " | " between columns

      const fixedWidth = filteredColumns
        .filter((col) => !col.flexible)
        .reduce((sum, col) => sum + col.width, 0);

      const flexibleColumns = filteredColumns.filter((col) => col.flexible);
      const minFlexWidth = flexibleColumns.reduce((sum, col) => sum + col.minWidth, 0);

      const usedWidth = rowPrefix + fixedWidth + minFlexWidth + dividerWidth;
      const availableSpace = Math.max(0, terminalWidth - 4 - usedWidth); // -4 for paddingX

      // Distribute available space equally among flexible columns
      const extraPerColumn = Math.floor(availableSpace / Math.max(1, flexibleColumns.length));

      return filteredColumns.map((col) => ({
        ...col,
        width: col.flexible ? col.minWidth + extraPerColumn : col.width,
      }));
    }, [filteredColumns, terminalWidth]);

    // Helper to get the value for a specific column with dynamic width
    const getColumnValue = (subnet: Subnet, columnKey: SortColumn, width: number): string => {
      switch (columnKey) {
        case 'name':
          return subnet.name.substring(0, width).padEnd(width);
        case 'vlan':
          return subnet.vlanId.toString().padStart(width);
        case 'expected':
          return subnet.expectedDevices.toString().padStart(width);
        case 'planned':
          return subnet.subnetInfo
            ? subnet.subnetInfo.plannedDevices.toString().padStart(width)
            : '--'.padStart(width);
        case 'usable':
          return subnet.subnetInfo
            ? subnet.subnetInfo.usableHosts.toString().padStart(width)
            : '--'.padStart(width);
        case 'network': {
          const baseValue = subnet.subnetInfo?.networkAddress ?? 'Not calculated';
          // Add lock indicator if network is locked
          const lockIndicator = subnet.networkLocked ? '*' : '';
          const displayValue = `${baseValue}${lockIndicator}`;
          return displayValue.substring(0, width).padEnd(width);
        }
        case 'description':
          return (subnet.description ?? '').substring(0, width).padEnd(width);
        default:
          return '';
      }
    };

    // Helper to render a column header with sort indicator
    const renderHeader = (
      column: { key: SortColumn; label: string; width: number; align: 'left' | 'right' },
      index: number,
    ): React.ReactElement => {
      const isSorted = sortColumn === column.key;
      const isSelected = headerMode && selectedHeaderIndex === index;
      const sortIndicator = isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
      const label =
        column.align === 'right'
          ? `${column.label}${sortIndicator}`.padStart(column.width)
          : `${column.label}${sortIndicator}`.padEnd(column.width);

      // Show warning color for either selected (in header mode) or sorted columns
      if (isSelected || isSorted) {
        return <Text key={column.key}>{colors.warning(label)}</Text>;
      }
      return <Text key={column.key}>{colors.muted(label)}</Text>;
    };

    if (subnets.length === 0) {
      return (
        <Box flexDirection="column" paddingX={2} paddingY={3} flexGrow={1}>
          <Box marginBottom={2}>
            <Text bold>{colors.slate('Subnets')}</Text>
          </Box>
          <Box>
            <Text>{colors.muted('No subnets defined yet.')}</Text>
          </Box>
          <Box marginTop={1}>
            <Text>{colors.dim('Press ')}</Text>
            <Text bold>{colors.accent('a')}</Text>
            <Text>{colors.dim(' to add your first subnet')}</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" paddingX={2} paddingY={0} flexGrow={1}>
        {/* Table Header with virtualization indicator */}
        <Box marginBottom={0}>
          <Text bold>{colors.slate('Subnets')}</Text>
          <Text> </Text>
          {subnets.length > viewportSize ? (
            <Text>
              {colors.dim(
                `(${viewportStart + 1}-${Math.min(viewportStart + viewportSize, subnets.length)} of ${subnets.length})`,
              )}
            </Text>
          ) : (
            <Text>{colors.dim(`(${subnets.length})`)}</Text>
          )}
        </Box>

        {/* Column Headers - interactive with sort indicators */}
        <Box marginBottom={0}>
          {headerMode ? (
            <Text>{colors.warning(symbols.selected)}</Text>
          ) : (
            <Text>{colors.dim(symbols.unselected)}</Text>
          )}
          <Text> </Text>
          <Text>{colors.muted('#'.padEnd(2))}</Text>
          <Text> {colors.dim(symbols.divider)} </Text>
          {columns.map((column, index) => (
            <React.Fragment key={column.key}>
              {renderHeader(column, index)}
              {index < columns.length - 1 && <Text> {colors.dim(symbols.divider)} </Text>}
            </React.Fragment>
          ))}
        </Box>

        {/* Subtle divider */}
        <Box marginBottom={0}>
          <Text>
            {colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}
          </Text>
        </Box>

        {/* Data Rows - only render visible rows for virtualization */}
        <Box flexDirection="column">
          {/* Slice subnets to only show visible viewport */}
          {subnets
            .slice(viewportStart, viewportStart + viewportSize)
            .map((subnet, viewportIndex) => {
              const actualIndex = viewportStart + viewportIndex;
              const isSelected = actualIndex === selectedIndex;
              const rowNumber = (actualIndex + 1).toString().padStart(2);

              return (
                <Box key={actualIndex} marginBottom={0}>
                  {/* Row selector */}
                  {isSelected ? (
                    <Text>{colors.highlight(symbols.selected)}</Text>
                  ) : (
                    <Text>{colors.dim(symbols.unselected)}</Text>
                  )}
                  <Text> </Text>
                  {/* Row number */}
                  {isSelected ? (
                    <Text>{colors.accent(rowNumber)}</Text>
                  ) : (
                    <Text>{colors.dim(rowNumber)}</Text>
                  )}
                  <Text> {colors.dim(symbols.divider)} </Text>
                  {/* Dynamic columns */}
                  {columns.map((column, colIndex) => {
                    const value = getColumnValue(subnet, column.key, column.width);
                    const hasData =
                      column.key === 'planned' ||
                      column.key === 'usable' ||
                      column.key === 'network'
                        ? subnet.subnetInfo !== undefined
                        : true;

                    return (
                      <React.Fragment key={column.key}>
                        {isSelected ? (
                          <Text>{colors.accent(value)}</Text>
                        ) : hasData ? (
                          <Text>
                            {column.key === 'name'
                              ? colors.slate(value)
                              : column.key === 'description' && value.trim() === ''
                                ? colors.dim(value)
                                : colors.muted(value)}
                          </Text>
                        ) : (
                          <Text>{colors.dim(value)}</Text>
                        )}
                        {colIndex < columns.length - 1 && (
                          <Text> {colors.dim(symbols.divider)} </Text>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              );
            })}

          {/* Add empty placeholder rows to ensure consistent height */}
          {Array.from({
            length: Math.max(0, viewportSize - Math.min(subnets.length, viewportSize)),
          }).map((_, index) => (
            <Box key={`empty-${index}`} minHeight={1}>
              <Text> </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  },
);
