/**
 * Layout Component
 * Main layout wrapper with header, footer, and notification system
 */

import { Box } from 'ink';
import React from 'react';
import { usePlan, useSubnets } from '../../hooks/usePlan.js';
import { useNotifications } from '../../hooks/useUI.js';
import { NotificationDisplay } from '../widgets/NotificationDisplay.js';
import { Footer } from './Footer.js';
import { Header } from './Header.js';

export interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const plan = usePlan();
  const subnets = useSubnets();
  const notifications = useNotifications();

  if (!plan) {
    return <Box>{children}</Box>;
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header plan={plan} />
      <Box flexGrow={1} minHeight={25} flexDirection="column">
        {children}
      </Box>
      <Footer hasSubnets={subnets.length > 0} hasCalculation={!!plan.supernet} />

      {/* Notifications - positioned at bottom */}
      {notifications.length > 0 && (
        <Box flexDirection="column" paddingX={2}>
          {notifications.map((notification) => (
            <NotificationDisplay key={notification.id} notification={notification} />
          ))}
        </Box>
      )}
    </Box>
  );
};
