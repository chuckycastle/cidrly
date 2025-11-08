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

  interface FooterCommand {
    format?: string; // New: "(key)x(label)port" or "(label)e(key)x(label)port"
    key?: string; // Legacy: 'x'
    label?: string; // Legacy: 'port'
    enabled: boolean;
  }

  interface CommandGroup {
    commands: Array<FooterCommand>;
  }

  /**
   * Parse format string into renderable segments
   * Format: "(key)X(label)YYY" → [{type:'key', text:'X'}, {type:'label', text:'YYY'}]
   */
  const parseFormat = (format: string): Array<{ type: 'key' | 'label'; text: string }> => {
    const segments: Array<{ type: 'key' | 'label'; text: string }> = [];
    const regex = /\(([^)]+)\)([^(]*)/g;
    let match;

    while ((match = regex.exec(format)) !== null) {
      const type = match[1] as 'key' | 'label';
      const text = match[2];
      if (text) {
        segments.push({ type, text });
      }
    }

    return segments;
  };

  const commandGroups: CommandGroup[] = [
    // Navigation & Info
    {
      commands: [
        { key: '↑↓', label: 'nav', enabled: hasSubnets },
        { format: '(label)sor(key)t', enabled: hasSubnets },
      ],
    },
    // Actions
    {
      commands: [
        { key: 'a', label: 'dd', enabled: true },
        { key: 'e', label: 'dit', enabled: hasSubnets },
        { key: 'm', label: 'od', enabled: hasSubnets && hasCalculation },
        { key: 'd', label: 'el', enabled: hasSubnets },
        { key: 'c', label: 'alc', enabled: hasSubnets },
      ],
    },
    // File Operations
    {
      commands: [
        { key: 's', label: 'ave', enabled: hasCalculation },
        { key: 'l', label: 'oad', enabled: true },
        { key: 'n', label: 'ew', enabled: true },
        { format: '(label)e(key)x(label)port', enabled: hasCalculation },
        { key: 'p', label: 'refs', enabled: true },
      ],
    },
    // System
    {
      commands: [{ key: 'q', label: 'uit', enabled: true }],
    },
  ];

  // Render a single command
  const renderCommand = (cmd: FooterCommand, key: string): React.ReactElement => {
    // New format with segments
    if (cmd.format) {
      const segments = parseFormat(cmd.format);
      return (
        <Box key={key} marginRight={isVeryNarrow ? 1 : 2}>
          {cmd.enabled ? (
            <>
              {segments.map((segment, idx) =>
                segment.type === 'key' ? (
                  <Text key={idx} bold>
                    {colors.accent(segment.text)}
                  </Text>
                ) : (
                  <Text key={idx}>{colors.muted(segment.text)}</Text>
                ),
              )}
            </>
          ) : (
            <Text>{colors.dim(segments.map((s) => s.text).join(''))}</Text>
          )}
        </Box>
      );
    }

    // Legacy format with key + label
    return (
      <Box key={key} marginRight={isVeryNarrow ? 1 : 2}>
        {cmd.enabled ? (
          <>
            <Text bold>{colors.accent(cmd.key!)}</Text>
            <Text>{colors.muted(cmd.label!)}</Text>
          </>
        ) : (
          <Text>{colors.dim(`${cmd.key}${cmd.label}`)}</Text>
        )}
      </Box>
    );
  };

  // Render a divider between groups
  const renderDivider = (key: string): React.ReactElement => (
    <Box key={key} marginRight={isVeryNarrow ? 1 : 2}>
      <Text>{colors.dim(symbols.divider)}</Text>
    </Box>
  );

  // For very narrow screens, show essential commands only
  if (isVeryNarrow) {
    const essentialCommands: FooterCommand[] = [
      { format: '(label)sor(key)t', enabled: hasSubnets },
      { key: 'a', label: 'dd', enabled: true },
      { key: 'e', label: 'dit', enabled: hasSubnets },
      { key: 'm', label: 'od', enabled: hasSubnets && hasCalculation },
      { key: 'd', label: 'el', enabled: hasSubnets },
      { key: 'c', label: 'alc', enabled: hasSubnets },
      { key: 's', label: 'ave', enabled: hasCalculation },
      { key: 'l', label: 'oad', enabled: true },
      { format: '(label)e(key)x(label)port', enabled: hasCalculation },
      { key: 'p', label: 'refs', enabled: true },
      { key: 'q', label: 'uit', enabled: true },
    ];

    return (
      <Box paddingX={2} paddingY={0} flexDirection="column">
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
      <Box paddingX={2} paddingY={0} flexDirection="column">
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
    <Box paddingX={2} paddingY={0} flexDirection="column">
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
