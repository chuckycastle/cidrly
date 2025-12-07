/**
 * Plan Store
 * Zustand store for managing network plan state with auto-generated selectors and Immer middleware
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { calculateAvailableSpace } from '../core/calculators/availability-calculator.js';
import type { AssignedBlock, NetworkPlan, Subnet } from '../core/models/network-plan.js';
import { NetworkPlanService } from '../services/network-plan.service.js';
import { createSelectors } from './createSelectors.js';

interface PlanState {
  // State
  plan: NetworkPlan | null;
  planService: NetworkPlanService;
  currentFilename: string | null; // Track the last saved filename for auto-save

  // Actions
  loadPlan: (plan: NetworkPlan) => void;
  setCurrentFilename: (filename: string | null) => void;
  setPlanName: (name: string) => void;
  addSubnet: (subnet: Subnet) => void;
  updateSubnet: (
    index: number,
    name: string,
    vlanId: number,
    expectedDevices: number,
    description?: string,
  ) => void;
  removeSubnet: (index: number) => Subnet | null;
  calculatePlan: () => void;
  updateBaseIp: (newBaseIp: string) => void;
  setGrowthPercentage: (growthPercentage: number) => void;
  setManualNetworkAddress: (index: number, networkAddress: string, lock: boolean) => void;
  setNetworkLocked: (index: number, locked: boolean) => void;
  clearPlan: () => void;

  // IPAM-lite Actions
  setAssignedBlocks: (blocks: AssignedBlock[]) => void;
  addAssignedBlock: (block: Omit<AssignedBlock, 'id' | 'assignedAt'>) => AssignedBlock | null;
  removeAssignedBlock: (blockId: string) => boolean;
  setSourceBlockId: (index: number, sourceBlockId: string | undefined) => void;
  updateSpaceReport: () => void;
  allocateSubnetFromAvailableSpace: (
    subnetId: string,
    networkAddress: string,
    sourceBlockId: string,
  ) => boolean;
}

const usePlanStoreBase = create<PlanState>()(
  immer((set, get) => ({
    // Initial state
    plan: null,
    planService: new NetworkPlanService(),
    currentFilename: null,

    // Actions
    loadPlan: (plan: NetworkPlan): void => {
      set({ plan });
    },

    setCurrentFilename: (filename: string | null): void => {
      set({ currentFilename: filename });
    },

    setPlanName: (name: string): void => {
      set((state) => {
        if (state.plan) {
          state.plan.name = name;
        }
      });
    },

    addSubnet: (subnet: Subnet): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.addSubnet(plan, subnet);
        set({ plan: newPlan });
      }
    },

    updateSubnet: (
      index: number,
      name: string,
      vlanId: number,
      expectedDevices: number,
      description?: string,
    ): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.updateSubnet(
          plan,
          index,
          name,
          vlanId,
          expectedDevices,
          description,
        );
        set({ plan: newPlan });
      }
    },

    removeSubnet: (index: number): Subnet | null => {
      const { plan, planService } = get();
      if (plan) {
        const { plan: newPlan, removed } = planService.removeSubnet(plan, index);
        set({ plan: newPlan });
        return removed;
      }
      return null;
    },

    calculatePlan: (): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.calculatePlan(plan);
        set({ plan: newPlan });
      }
    },

    updateBaseIp: (newBaseIp: string): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.updateBaseIp(plan, newBaseIp);
        set({ plan: newPlan });
      }
    },

    setGrowthPercentage: (growthPercentage: number): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.setGrowthPercentage(plan, growthPercentage);
        set({ plan: newPlan });
      }
    },

    setManualNetworkAddress: (index: number, networkAddress: string, lock: boolean): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.setManualNetworkAddress(plan, index, networkAddress, lock);
        set({ plan: newPlan });
      }
    },

    setNetworkLocked: (index: number, locked: boolean): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.setNetworkLocked(plan, index, locked);
        set({ plan: newPlan });
      }
    },

    clearPlan: (): void => {
      set((state) => {
        state.plan = null;
        state.currentFilename = null;
      });
    },

    // IPAM-lite Actions
    setAssignedBlocks: (blocks: AssignedBlock[]): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.setAssignedBlocks(plan, blocks);
        set({ plan: newPlan });
      }
    },

    addAssignedBlock: (block: Omit<AssignedBlock, 'id' | 'assignedAt'>): AssignedBlock | null => {
      const { plan, planService } = get();
      if (plan) {
        const { plan: newPlan, block: newBlock } = planService.addAssignedBlock(plan, block);
        set({ plan: newPlan });
        return newBlock;
      }
      return null;
    },

    removeAssignedBlock: (blockId: string): boolean => {
      const { plan, planService } = get();
      if (plan) {
        const { plan: newPlan, removed } = planService.removeAssignedBlock(plan, blockId);
        set({ plan: newPlan });
        return removed;
      }
      return false;
    },

    setSourceBlockId: (index: number, sourceBlockId: string | undefined): void => {
      const { plan, planService } = get();
      if (plan) {
        const newPlan = planService.setSourceBlockId(plan, index, sourceBlockId);
        set({ plan: newPlan });
      }
    },

    updateSpaceReport: (): void => {
      set((state) => {
        if (state.plan && state.plan.assignedBlocks) {
          state.plan.spaceReport = calculateAvailableSpace(
            state.plan.assignedBlocks,
            state.plan.subnets,
          );
        }
      });
    },

    allocateSubnetFromAvailableSpace: (
      subnetId: string,
      networkAddress: string,
      sourceBlockId: string,
    ): boolean => {
      const { plan } = get();
      if (!plan) return false;

      const subnetIndex = plan.subnets.findIndex((s) => s.id === subnetId);
      if (subnetIndex === -1) return false;

      set((state) => {
        const subnet = state.plan?.subnets[subnetIndex];
        if (subnet && subnet.subnetInfo) {
          // Update the network address
          subnet.subnetInfo.networkAddress = networkAddress;
          // Set the source block
          subnet.sourceBlockId = sourceBlockId;
          // Update timestamp
          if (state.plan) {
            state.plan.updatedAt = new Date();
          }
        }
      });

      return true;
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
