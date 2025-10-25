/**
 * Plan Store
 * Zustand store for managing network plan state with auto-generated selectors and Immer middleware
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import { NetworkPlanService } from '../services/network-plan.service.js';
import { createSelectors } from './createSelectors.js';

interface PlanState {
  // State
  plan: NetworkPlan | null;
  planService: NetworkPlanService;

  // Actions
  loadPlan: (plan: NetworkPlan) => void;
  addSubnet: (subnet: Subnet) => void;
  updateSubnet: (index: number, name: string, vlanId: number, expectedDevices: number) => void;
  removeSubnet: (index: number) => Subnet | null;
  calculatePlan: () => void;
  updateBaseIp: (newBaseIp: string) => void;
  clearPlan: () => void;
}

const usePlanStoreBase = create<PlanState>()(
  immer((set, get) => ({
    // Initial state
    plan: null,
    planService: new NetworkPlanService(),

    // Actions
    loadPlan: (plan: NetworkPlan) => {
      set({ plan });
    },

    addSubnet: (subnet: Subnet) => {
      const { plan, planService } = get();
      if (plan) {
        planService.addSubnet(plan, subnet);
        set({ plan: { ...plan } });
      }
    },

    updateSubnet: (index: number, name: string, vlanId: number, expectedDevices: number) => {
      const { plan, planService } = get();
      if (plan) {
        planService.updateSubnet(plan, index, name, vlanId, expectedDevices);
        set({ plan: { ...plan } });
      }
    },

    removeSubnet: (index: number) => {
      const { plan, planService } = get();
      if (plan) {
        const removed = planService.removeSubnet(plan, index);
        set({ plan: { ...plan } });
        return removed;
      }
      return null;
    },

    calculatePlan: () => {
      const { plan, planService } = get();
      if (plan) {
        planService.calculatePlan(plan);
        set({ plan: { ...plan } });
      }
    },

    updateBaseIp: (newBaseIp: string) => {
      const { plan, planService } = get();
      if (plan) {
        planService.updateBaseIp(plan, newBaseIp);
        set({ plan: { ...plan } });
      }
    },

    clearPlan: () => {
      set((state) => {
        state.plan = null;
      });
    },
  })),
);

/**
 * Plan Store with auto-generated selectors
 *
 * @example
 * ```tsx
 * // Old way:
 * const plan = usePlanStore((s) => s.plan)
 * const addSubnet = usePlanStore((s) => s.addSubnet)
 *
 * // New way (both still work!):
 * const plan = usePlanStore.use.plan()
 * const addSubnet = usePlanStore.use.addSubnet()
 * ```
 */
export const usePlanStore = createSelectors(usePlanStoreBase);
