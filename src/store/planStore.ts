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
  setGrowthPercentage: (growthPercentage: number) => void;
  clearPlan: () => void;
}

const usePlanStoreBase = create<PlanState>()(
  immer((set, get) => ({
    // Initial state
    plan: null,
    planService: new NetworkPlanService(),

    // Actions
    loadPlan: (plan: NetworkPlan): void => {
      set({ plan });
    },

    addSubnet: (subnet: Subnet): void => {
      const { plan, planService } = get();
      if (plan) {
        planService.addSubnet(plan, subnet);
        set({ plan: { ...plan } });
      }
    },

    updateSubnet: (index: number, name: string, vlanId: number, expectedDevices: number): void => {
      const { plan, planService } = get();
      if (plan) {
        planService.updateSubnet(plan, index, name, vlanId, expectedDevices);
        set({ plan: { ...plan } });
      }
    },

    removeSubnet: (index: number): Subnet | null => {
      const { plan, planService } = get();
      if (plan) {
        const removed = planService.removeSubnet(plan, index);
        set({ plan: { ...plan } });
        return removed;
      }
      return null;
    },

    calculatePlan: (): void => {
      const { plan, planService } = get();
      if (plan) {
        planService.calculatePlan(plan);
        set({ plan: { ...plan } });
      }
    },

    updateBaseIp: (newBaseIp: string): void => {
      const { plan, planService } = get();
      if (plan) {
        planService.updateBaseIp(plan, newBaseIp);
        set({ plan: { ...plan } });
      }
    },

    setGrowthPercentage: (growthPercentage: number): void => {
      const { plan, planService } = get();
      if (plan) {
        planService.setGrowthPercentage(plan, growthPercentage);
        set({ plan: { ...plan } });
      }
    },

    clearPlan: (): void => {
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
