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
    const getStyleByType = (type: Notification['type']): { color: (s: string) => string; icon: string } => {
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

    const getPriorityIndicator = (priority?: Notification['priority']): { symbol: string; color: (s: string) => string } | null => {
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
      <Box borderStyle="round" paddingX={2} paddingY={0} flexDirection="column">
        <Box>
          {priorityIndicator && (
            <>
              <Text>{priorityIndicator.color(priorityIndicator.symbol)}</Text>
              <Text> </Text>
            </>
          )}
          <Text bold>{style.color(`${style.icon} `)}</Text>
          <Text>{colors.slate(notification.message)}</Text>
        </Box>
      </Box>
    );
  },
);
