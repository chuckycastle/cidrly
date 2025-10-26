/**
 * Dashboard Command
 * Explicitly launches the interactive dashboard
 * Alias: 'd' for quick access
 */

import { DashboardApp } from '../components/DashboardApp.js';
import { createNetworkPlan } from '../core/models/network-plan.js';
import { usePlan, usePlanActions } from '../hooks/usePlan.js';

// Set command alias
export const alias = 'd';

export default function Dashboard() {
  // Initialize with a default plan if none exists
  const plan = usePlan();
  const { loadPlan } = usePlanActions();

  if (!plan) {
    const defaultPlan = createNetworkPlan('New Network Plan', '10.0.0.0');
    loadPlan(defaultPlan);
  }

  return <>{plan && <DashboardApp />}</>;
}
