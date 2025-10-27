/**
 * Custom hooks for Plan Store
 * Provides convenient access to plan state and actions
 */

import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import type { NetworkPlanService } from '../services/network-plan.service.js';
import { usePlanStore } from '../store/planStore.js';

/**
 * Hook to access the current network plan
 *
 * @returns The current network plan or null
 *
 * @example
 * ```tsx
 * const plan = usePlan();
 * if (plan) {
 *   console.log(plan.name, plan.subnets.length);
 * }
 * ```
 */
export const usePlan = (): NetworkPlan | null => {
  return usePlanStore.use.plan();
};

/**
 * Hook to access plan state properties
 *
 * @returns Plan state including plan and planService
 *
 * @example
 * ```tsx
 * const { plan, planService } = usePlanState();
 * ```
 */
export const usePlanState = (): { plan: NetworkPlan | null; planService: NetworkPlanService } => {
  const plan = usePlanStore.use.plan();
  const planService = usePlanStore.use.planService();
  return { plan, planService };
};

/**
 * Hook to access plan actions
 *
 * @returns Object containing all plan manipulation functions
 *
 * @example
 * ```tsx
 * const { addSubnet, removeSubnet, calculatePlan } = usePlanActions();
 *
 * const handleAdd = () => {
 *   addSubnet({ name: 'Engineering', vlanId: 10, expectedDevices: 50 });
 * };
 * ```
 */
export const usePlanActions = (): {
  loadPlan: (plan: NetworkPlan) => void;
  addSubnet: (subnet: Subnet) => void;
  updateSubnet: (index: number, name: string, vlanId: number, expectedDevices: number) => void;
  removeSubnet: (index: number) => Subnet | null;
  calculatePlan: () => void;
  updateBaseIp: (newBaseIp: string) => void;
  clearPlan: () => void;
} => {
  const loadPlan = usePlanStore.use.loadPlan();
  const addSubnet = usePlanStore.use.addSubnet();
  const updateSubnet = usePlanStore.use.updateSubnet();
  const removeSubnet = usePlanStore.use.removeSubnet();
  const calculatePlan = usePlanStore.use.calculatePlan();
  const updateBaseIp = usePlanStore.use.updateBaseIp();
  const clearPlan = usePlanStore.use.clearPlan();

  return {
    loadPlan,
    addSubnet,
    updateSubnet,
    removeSubnet,
    calculatePlan,
    updateBaseIp,
    clearPlan,
  };
};

/**
 * Hook to access a specific subnet by index
 *
 * @param index - The index of the subnet to retrieve
 * @returns The subnet at the given index or undefined
 *
 * @example
 * ```tsx
 * const subnet = useSubnet(0);
 * if (subnet) {
 *   console.log(subnet.name, subnet.vlanId);
 * }
 * ```
 */
export const useSubnet = (index: number): Subnet | undefined => {
  const plan = usePlanStore.use.plan();
  return plan?.subnets[index];
};

/**
 * Hook to access all subnets
 *
 * @returns Array of subnets or empty array if no plan
 *
 * @example
 * ```tsx
 * const subnets = useSubnets();
 * return <SubnetList subnets={subnets} />;
 * ```
 */
export const useSubnets = (): Subnet[] => {
  const plan = usePlanStore.use.plan();
  return plan?.subnets ?? [];
};

/**
 * Hook to access the supernet information
 *
 * @returns Supernet info or undefined
 *
 * @example
 * ```tsx
 * const supernet = useSupernet();
 * if (supernet) {
 *   console.log('Efficiency:', supernet.efficiency);
 * }
 * ```
 */
export const useSupernet = (): NetworkPlan['supernet'] | undefined => {
  const plan = usePlanStore.use.plan();
  return plan?.supernet;
};
