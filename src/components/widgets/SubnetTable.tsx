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
  }) => {
    const terminalWidth = useTerminalWidth();

    // All available columns
    const allColumns: Array<{
      key: SortColumn;
      label: string;
      width: number;
      align: 'left' | 'right';
    }> = [
      { key: 'name', label: 'Name', width: 20, align: 'left' },
      { key: 'vlan', label: 'VLAN', width: 6, align: 'right' },
      { key: 'expected', label: 'Exp', width: 5, align: 'right' },
      { key: 'planned', label: 'Plan', width: 6, align: 'right' },
      { key: 'cidr', label: 'CIDR', width: 6, align: 'right' },
      { key: 'usable', label: 'Hosts', width: 7, align: 'right' },
      { key: 'network', label: 'Network', width: 17, align: 'left' },
      { key: 'description', label: 'Description', width: 20, align: 'left' },
    ];

    // Filter and order columns based on preferences
    const columns =
      columnOrder && visibleColumns
        ? columnOrder
            .filter((key) => key === 'name' || visibleColumns.includes(key))
            .map((key) => allColumns.find((col) => col.key === key))
            .filter((col): col is NonNullable<typeof col> => col !== undefined)
        : visibleColumns
          ? allColumns.filter((col) => col.key === 'name' || visibleColumns.includes(col.key))
          : allColumns;

    // Helper to get the value for a specific column
    const getColumnValue = (subnet: Subnet, columnKey: SortColumn): string => {
      switch (columnKey) {
        case 'name':
          return subnet.name.substring(0, 20).padEnd(20);
        case 'vlan':
          return subnet.vlanId.toString().padStart(6);
        case 'expected':
          return subnet.expectedDevices.toString().padStart(5);
        case 'planned':
          return subnet.subnetInfo
            ? subnet.subnetInfo.plannedDevices.toString().padStart(6)
            : '--'.padStart(6);
        case 'cidr':
          return subnet.subnetInfo
            ? `/${subnet.subnetInfo.cidrPrefix}`.padStart(6)
            : 'N/A'.padStart(6);
        case 'usable':
          return subnet.subnetInfo
            ? subnet.subnetInfo.usableHosts.toString().padStart(7)
            : '--'.padStart(7);
        case 'network':
          return (subnet.subnetInfo?.networkAddress ?? 'Not calculated')
            .substring(0, 17)
            .padEnd(17);
        case 'description':
          return (subnet.description ?? '').substring(0, 20).padEnd(20);
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
        {/* Table Header */}
        <Box marginBottom={0}>
          <Text bold>{colors.slate('Subnets')}</Text>
          <Text> </Text>
          <Text>{colors.dim(`(${subnets.length})`)}</Text>
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

        {/* Data Rows */}
        <Box flexDirection="column">
          {/* Minimum 12 rows to ensure consistent height for dialogs */}
          {subnets.map((subnet, index) => {
            const isSelected = index === selectedIndex;
            const rowNumber = (index + 1).toString().padStart(2);

            return (
              <Box key={index} marginBottom={0}>
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
                  const value = getColumnValue(subnet, column.key);
                  const hasData =
                    column.key === 'planned' ||
                    column.key === 'cidr' ||
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

          {/* Add empty placeholder rows to ensure minimum 12 rows */}
          {Array.from({ length: Math.max(0, 12 - subnets.length) }).map((_, index) => (
            <Box key={`empty-${index}`} minHeight={1}>
              <Text> </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  },
);
