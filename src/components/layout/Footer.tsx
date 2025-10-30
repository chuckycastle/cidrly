/**
 * Footer Component
 * Clean command bar with grouped shortcuts - no borders
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useTerminalWidth } from '../../hooks/useTerminalWidth.js';
import { colors, symbols } from '../../themes/colors.js';

export interface FooterProps {
  hasSubnets: boolean;
  hasCalculation: boolean;
}

export const Footer: React.FC<FooterProps> = React.memo(({ hasSubnets, hasCalculation }) => {
  const terminalWidth = useTerminalWidth();

  // Define layout breakpoints
  const isNarrow = terminalWidth < 80;
  const isVeryNarrow = terminalWidth < 60;

  interface CommandGroup {
    commands: Array<{ key: string; label: string; enabled: boolean }>;
  }

  const commandGroups: CommandGroup[] = [
    // Navigation & Info
    {
      commands: [
        { key: '↑↓', label: 'navigate', enabled: hasSubnets },
        { key: 'i', label: 'info', enabled: hasSubnets },
      ],
    },
    // Actions
    {
      commands: [
        { key: 'a', label: 'add', enabled: true },
        { key: 'e', label: 'edit', enabled: hasSubnets },
        { key: 'x', label: 'delete', enabled: hasSubnets },
        { key: 'c', label: 'calculate', enabled: hasSubnets },
      ],
    },
    // File Operations
    {
      commands: [
        { key: 's', label: 'save', enabled: hasCalculation },
        { key: 'l', label: 'load', enabled: true },
        { key: 'n', label: 'new', enabled: true },
        { key: 'b', label: 'base ip', enabled: true },
      ],
    },
    // System
    {
      commands: [{ key: 'q', label: 'quit', enabled: true }],
    },
  ];

  // Render a single command
  const renderCommand = (
    cmd: { key: string; label: string; enabled: boolean },
    key: string,
  ): React.ReactElement => (
    <Box key={key} marginRight={isVeryNarrow ? 1 : 2}>
      {cmd.enabled ? (
        <>
          <Text bold>{colors.accent(cmd.key)}</Text>
          <Text>{colors.muted(` ${cmd.label}`)}</Text>
        </>
      ) : (
        <Text>{colors.dim(`${cmd.key} ${cmd.label}`)}</Text>
      )}
    </Box>
  );

  // Render a divider between groups
  const renderDivider = (key: string): React.ReactElement => (
    <Box key={key} marginRight={isVeryNarrow ? 1 : 2}>
      <Text>{colors.dim(symbols.divider)}</Text>
    </Box>
  );

  // For very narrow screens, show essential commands only
  if (isVeryNarrow) {
    const essentialCommands = [
      { key: 'a', label: 'add', enabled: true },
      { key: 'e', label: 'edit', enabled: hasSubnets },
      { key: 'c', label: 'calc', enabled: hasSubnets },
      { key: 's', label: 'save', enabled: hasCalculation },
      { key: 'q', label: 'quit', enabled: true },
    ];

    return (
      <Box paddingX={2} paddingY={1} flexDirection="column">
        {/* Subtle top divider */}
        <Box marginBottom={0}>
          <Text>
            {colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}
          </Text>
        </Box>

        {/* Essential commands on one line */}
        <Box flexWrap="wrap">
          {essentialCommands.map((cmd, index) => (
            <React.Fragment key={index}>
              {renderCommand(cmd, `essential-${index}`)}
              {index < essentialCommands.length - 1 && renderDivider(`div-${index}`)}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  }

  // For narrow screens, wrap command groups into multiple rows
  if (isNarrow) {
    return (
      <Box paddingX={2} paddingY={1} flexDirection="column">
        {/* Subtle top divider */}
        <Box marginBottom={0}>
          <Text>
            {colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}
          </Text>
        </Box>

        {/* First row: Navigation & Actions */}
        <Box flexWrap="wrap" marginBottom={0}>
          {commandGroups.slice(0, 2).map((group, groupIndex) => (
            <React.Fragment key={`row1-${groupIndex}`}>
              {group.commands.map(
                (cmd, cmdIndex): React.ReactElement =>
                  renderCommand(cmd, `row1-${groupIndex}-${cmdIndex}`),
              )}
              {groupIndex < 1 && renderDivider(`row1-div-${groupIndex}`)}
            </React.Fragment>
          ))}
        </Box>

        {/* Second row: File Operations & System */}
        <Box flexWrap="wrap">
          {commandGroups.slice(2).map((group, groupIndex) => (
            <React.Fragment key={`row2-${groupIndex}`}>
              {group.commands.map(
                (cmd, cmdIndex): React.ReactElement =>
                  renderCommand(cmd, `row2-${groupIndex}-${cmdIndex}`),
              )}
              {groupIndex < commandGroups.slice(2).length - 1 &&
                renderDivider(`row2-div-${groupIndex}`)}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  }

  // For wide screens, show all commands in one row
  return (
    <Box paddingX={2} paddingY={1} flexDirection="column">
      {/* Subtle top divider */}
      <Box marginBottom={0}>
        <Text>{colors.dim(symbols.horizontalDivider.repeat(Math.max(0, terminalWidth - 4)))}</Text>
      </Box>

      {/* Command groups */}
      <Box flexWrap="wrap">
        {commandGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.commands.map(
              (cmd, cmdIndex): React.ReactElement =>
                renderCommand(cmd, `${groupIndex}-${cmdIndex}`),
            )}
            {groupIndex < commandGroups.length - 1 && renderDivider(`div-${groupIndex}`)}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
});
