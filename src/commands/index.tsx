/**
 * Index Command (Default)
 * Launches the interactive dashboard when no command is specified
 */

import { useEffect } from 'react';
import { DashboardApp } from '../components/DashboardApp.js';
import { Footer } from '../components/layout/Footer.js';
import { Header } from '../components/layout/Header.js';
import { NotificationDisplay } from '../components/widgets/NotificationDisplay.js';
import { createNetworkPlan } from '../core/models/network-plan.js';
import { usePlan, usePlanActions, useSubnets } from '../hooks/usePlan.js';
import { useCurrentView, useNotifications } from '../hooks/useUI.js';

// Mark this as the default command
export const isDefault = true;

export default function Index() {
  // Clear terminal screen on launch
  useEffect(() => {
    process.stdout.write('\x1Bc'); // Full terminal reset (clears screen and scrollback)
  }, []);

  // Initialize with a default plan if none exists
  const plan = usePlan();
  const subnets = useSubnets();
  const { loadPlan } = usePlanActions();
  const notifications = useNotifications();
  const currentView = useCurrentView();

  if (!plan) {
    const defaultPlan = createNetworkPlan('New Network Plan', '10.0.0.0');
    loadPlan(defaultPlan);
  }

  const hasSubnets = subnets.length > 0;
  const hasCalculation = plan?.supernet !== undefined;
  const showLayout = currentView !== 'welcome';

  return (
    <>
      {plan && (
        <>
          {showLayout && <Header plan={plan} />}
          <DashboardApp />
          {showLayout && <Footer hasSubnets={hasSubnets} hasCalculation={hasCalculation} />}
          {notifications.map((notification) => (
            <NotificationDisplay key={notification.id} notification={notification} />
          ))}
        </>
      )}
    </>
  );
}
