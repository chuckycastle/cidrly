/**
 * Index Command (Default)
 * Launches the interactive dashboard when no command is specified
 */

import { useEffect } from 'react';
import { DashboardApp } from '../components/DashboardApp.js';
import { NotificationDisplay } from '../components/widgets/NotificationDisplay.js';
import { createNetworkPlan } from '../core/models/network-plan.js';
import { usePlan, usePlanActions } from '../hooks/usePlan.js';
import { useNotifications } from '../hooks/useUI.js';

// Mark this as the default command
export const isDefault = true;

export default function Index() {
  // Clear terminal screen on launch
  useEffect(() => {
    process.stdout.write('\x1Bc'); // Full terminal reset (clears screen and scrollback)
  }, []);

  // Initialize with a default plan if none exists
  const plan = usePlan();
  const { loadPlan } = usePlanActions();
  const notifications = useNotifications();

  if (!plan) {
    const defaultPlan = createNetworkPlan('New Network Plan', '10.0.0.0');
    loadPlan(defaultPlan);
  }

  return (
    <>
      {plan && (
        <>
          <DashboardApp />
          {notifications.map((notification) => (
            <NotificationDisplay key={notification.id} notification={notification} />
          ))}
        </>
      )}
    </>
  );
}
