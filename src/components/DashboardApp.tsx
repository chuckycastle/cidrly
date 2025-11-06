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
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text bold>Documentation Available on GitHub Wiki</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              Help documentation is available at:{' '}
              <Text color="cyan">https://github.com/chuckycastle/cidrly/wiki</Text>
            </Text>
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Available Guides:</Text>
            <Text>• User Guide - Getting started, concepts, and workflows</Text>
            <Text>• Keyboard Shortcuts - Complete reference with examples</Text>
            <Text>• Examples and Tutorials - Practical scenarios and integrations</Text>
          </Box>
          <Box>
            <Text dimColor>Press Esc to return to dashboard</Text>
          </Box>
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
