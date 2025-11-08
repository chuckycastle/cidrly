/**
 * NotificationDisplay Widget
 * Toast-style notifications with modern styling, priorities, and positioning
 */

import { Box, Text } from 'ink';
import React from 'react';
import type { Notification } from '../../store/uiStore.js';
import { colors, symbols } from '../../themes/colors.js';

export interface NotificationDisplayProps {
  notification: Notification;
}

export const NotificationDisplay: React.FC<NotificationDisplayProps> = React.memo(
  ({ notification }) => {
    const getStyleByType = (
      type: Notification['type'],
    ): { color: (s: string) => string; icon: string } => {
      switch (type) {
        case 'success':
          return { color: colors.success, icon: symbols.success };
        case 'error':
          return { color: colors.error, icon: symbols.error };
        case 'warning':
          return { color: colors.warning, icon: symbols.warning };
        case 'info':
        default:
          return { color: colors.info, icon: symbols.info };
      }
    };

    const getPriorityIndicator = (
      priority?: Notification['priority'],
    ): { symbol: string; color: (s: string) => string } | null => {
      switch (priority) {
        case 'high':
          return { symbol: '‼', color: colors.error };
        case 'low':
          return { symbol: '·', color: colors.dim };
        case 'normal':
        default:
          return null;
      }
    };

    const style = getStyleByType(notification.type);
    const priorityIndicator = getPriorityIndicator(notification.priority);

    return (
      <Box paddingX={1} backgroundColor="black">
        <Text backgroundColor="black" color="cyan">
          [
        </Text>
        <Text backgroundColor="black"> </Text>
        {priorityIndicator && (
          <>
            <Text backgroundColor="black">{priorityIndicator.color(priorityIndicator.symbol)}</Text>
            <Text backgroundColor="black"> </Text>
          </>
        )}
        <Text bold backgroundColor="black">
          {style.color(`${style.icon} `)}
        </Text>
        <Text backgroundColor="black">{colors.slate(notification.message)}</Text>
        <Text backgroundColor="black"> </Text>
        <Text backgroundColor="black" color="cyan">
          ]
        </Text>
      </Box>
    );
  },
);
