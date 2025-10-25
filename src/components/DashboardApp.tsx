/**
 * DashboardApp Component
 * Main application router that manages views based on UI state
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useCurrentView } from '../hooks/useUI.js';
import { Layout } from './layout/Layout.js';
import { DashboardView } from './views/DashboardView.js';
import { WelcomeView } from './views/WelcomeView.js';

export const DashboardApp: React.FC = () => {
  const currentView = useCurrentView();

  // Welcome view (no layout)
  if (currentView === 'welcome') {
    return <WelcomeView />;
  }

  // All other views use the layout
  return (
    <Layout>
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'help' && (
        <Box>
          <Text>Help view - coming soon</Text>
        </Box>
      )}
      {currentView === 'detail' && (
        <Box>
          <Text>Detail view - coming soon</Text>
        </Box>
      )}
    </Layout>
  );
};
