/**
 * Dashboard Command
 * Explicitly launches the interactive dashboard
 * Alias: 'd' for quick access
 */

import { DashboardApp } from '../components/DashboardApp.js';
import { Footer } from '../components/layout/Footer.js';
import { Header } from '../components/layout/Header.js';
import { NotificationDisplay } from '../components/widgets/NotificationDisplay.js';
import { createNetworkPlan } from '../core/models/network-plan.js';
import { usePlan, usePlanActions, useSubnets } from '../hooks/usePlan.js';
import { useNotifications } from '../hooks/useUI.js';

// Set command alias
export const alias = 'd';

export default function Dashboard() {
  // Initialize with a default plan if none exists
  const plan = usePlan();
  const subnets = useSubnets();
  const { loadPlan } = usePlanActions();
  const notifications = useNotifications();

  if (!plan) {
    const defaultPlan = createNetworkPlan('New Network Plan', '10.0.0.0');
    loadPlan(defaultPlan);
  }

  const hasSubnets = subnets.length > 0;
  const hasCalculation = plan?.supernet !== undefined;

  return (
    <>
      {plan && (
        <>
          <Header plan={plan} />
          <DashboardApp />
          <Footer hasSubnets={hasSubnets} hasCalculation={hasCalculation} />
          {notifications.map((notification) => (
            <NotificationDisplay key={notification.id} notification={notification} />
          ))}
        </>
      )}
    </>
  );
}
