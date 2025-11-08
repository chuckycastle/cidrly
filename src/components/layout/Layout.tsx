/**
 * Layout Component
 * Main layout wrapper with header, footer, and notification system
 */

import { Box, useStdout } from 'ink';
import React, { useEffect, useState } from 'react';
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
  const { stdout } = useStdout();

  // Track terminal height with state to trigger re-renders on resize
  const [terminalHeight, setTerminalHeight] = useState(stdout?.rows ?? 31);

  // Listen for terminal resize events
  useEffect(() => {
    if (!stdout) return;

    const handleResize = (): void => {
      setTerminalHeight(stdout.rows ?? 31);
    };

    stdout.on('resize', handleResize);

    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  if (!plan) {
    return <Box>{children}</Box>;
  }

  return (
    <>
      {/* Main layout */}
      <Box flexDirection="column" height={terminalHeight}>
        <Header plan={plan} />
        <Box flexGrow={1} minHeight={25} flexDirection="column">
          {children}
        </Box>
        <Footer hasSubnets={subnets.length > 0} hasCalculation={!!plan.supernet} />
      </Box>

      {/* Notifications - overlay at top row, centered (only show most recent) */}
      {notifications.length > 0 && (
        <Box position="absolute" width="100%" flexDirection="row" justifyContent="center">
          <NotificationDisplay notification={notifications[notifications.length - 1]!} />
        </Box>
      )}
    </>
  );
};
