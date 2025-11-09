/**
 * Tests for Plan Store
 */

import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { usePlanStore } from '../../src/store/planStore.js';

describe('planStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    usePlanStore.setState({
      plan: null,
      currentFilename: null,
    });
  });

  describe('initial state', () => {
    it('should have null plan initially', () => {
      const state = usePlanStore.getState();
      expect(state.plan).toBeNull();
    });

    it('should have null currentFilename initially', () => {
      const state = usePlanStore.getState();
      expect(state.currentFilename).toBeNull();
    });

    it('should have planService instance', () => {
      const state = usePlanStore.getState();
      expect(state.planService).toBeDefined();
    });
  });

  describe('loadPlan', () => {
    it('should load a network plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan } = usePlanStore.getState();

      loadPlan(plan);

      const state = usePlanStore.getState();
      expect(state.plan).toEqual(plan);
      expect(state.plan?.name).toBe('Test Plan');
      expect(state.plan?.baseIp).toBe('10.0.0.0');
    });

    it('should replace existing plan when loading new one', () => {
      const plan1 = createNetworkPlan('Plan 1', '10.0.0.0');
      const plan2 = createNetworkPlan('Plan 2', '192.168.0.0');

      const { loadPlan } = usePlanStore.getState();

      loadPlan(plan1);
      expect(usePlanStore.getState().plan?.name).toBe('Plan 1');

      loadPlan(plan2);
      expect(usePlanStore.getState().plan?.name).toBe('Plan 2');
    });
  });

  describe('setCurrentFilename', () => {
    it('should set current filename', () => {
      const { setCurrentFilename } = usePlanStore.getState();

      setCurrentFilename('test.cidr');

      expect(usePlanStore.getState().currentFilename).toBe('test.cidr');
    });

    it('should allow setting filename to null', () => {
      const { setCurrentFilename } = usePlanStore.getState();

      setCurrentFilename('test.cidr');
      expect(usePlanStore.getState().currentFilename).toBe('test.cidr');

      setCurrentFilename(null);
      expect(usePlanStore.getState().currentFilename).toBeNull();
    });
  });

  describe('addSubnet', () => {
    it('should add subnet to plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet = createSubnet('Engineering', 10, 50);

      const { loadPlan, addSubnet } = usePlanStore.getState();

      loadPlan(plan);
      addSubnet(subnet);

      const state = usePlanStore.getState();
      expect(state.plan?.subnets).toHaveLength(1);
      expect(state.plan?.subnets[0]?.name).toBe('Engineering');
    });

    it('should not add subnet when plan is null', () => {
      const subnet = createSubnet('Engineering', 10, 50);
      const { addSubnet } = usePlanStore.getState();

      // No plan loaded
      addSubnet(subnet);

      const state = usePlanStore.getState();
      expect(state.plan).toBeNull();
    });
  });

  describe('updateSubnet', () => {
    it('should update subnet properties', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50, 'Initial desc'));

      const { loadPlan, updateSubnet } = usePlanStore.getState();

      loadPlan(plan);
      updateSubnet(0, 'Updated Name', 20, 100, 'Updated desc');

      const state = usePlanStore.getState();
      expect(state.plan?.subnets[0]?.name).toBe('Updated Name');
      expect(state.plan?.subnets[0]?.vlanId).toBe(20);
      expect(state.plan?.subnets[0]?.expectedDevices).toBe(100);
      expect(state.plan?.subnets[0]?.description).toBe('Updated desc');
    });

    it('should not update when plan is null', () => {
      const { updateSubnet } = usePlanStore.getState();

      // No plan loaded
      expect(() => {
        updateSubnet(0, 'Test', 10, 50);
      }).not.toThrow();

      const state = usePlanStore.getState();
      expect(state.plan).toBeNull();
    });
  });

  describe('removeSubnet', () => {
    it('should remove subnet and return it', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet1 = createSubnet('Engineering', 10, 50);
      const subnet2 = createSubnet('Marketing', 20, 25);
      plan.subnets.push(subnet1, subnet2);

      const { loadPlan, removeSubnet } = usePlanStore.getState();

      loadPlan(plan);
      const removed = removeSubnet(0);

      expect(removed?.name).toBe('Engineering');

      const state = usePlanStore.getState();
      expect(state.plan?.subnets).toHaveLength(1);
      expect(state.plan?.subnets[0]?.name).toBe('Marketing');
    });

    it('should return null when plan is null', () => {
      const { removeSubnet } = usePlanStore.getState();

      // No plan loaded
      const removed = removeSubnet(0);

      expect(removed).toBeNull();
    });
  });

  describe('calculatePlan', () => {
    it('should calculate plan and add subnetInfo', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const { loadPlan, calculatePlan } = usePlanStore.getState();

      loadPlan(plan);
      calculatePlan();

      const state = usePlanStore.getState();
      expect(state.plan?.subnets[0]?.subnetInfo).toBeDefined();
      expect(state.plan?.subnets[0]?.subnetInfo?.networkAddress).toBeDefined();
    });

    it('should not throw when plan is null', () => {
      const { calculatePlan } = usePlanStore.getState();

      // No plan loaded
      expect(() => {
        calculatePlan();
      }).not.toThrow();
    });
  });

  describe('updateBaseIp', () => {
    it('should update base IP address', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan, updateBaseIp } = usePlanStore.getState();

      loadPlan(plan);
      updateBaseIp('192.168.0.0');

      const state = usePlanStore.getState();
      expect(state.plan?.baseIp).toBe('192.168.0.0');
    });

    it('should not update when plan is null', () => {
      const { updateBaseIp } = usePlanStore.getState();

      expect(() => {
        updateBaseIp('192.168.0.0');
      }).not.toThrow();

      expect(usePlanStore.getState().plan).toBeNull();
    });
  });

  describe('setGrowthPercentage', () => {
    it('should set growth percentage', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan, setGrowthPercentage } = usePlanStore.getState();

      loadPlan(plan);
      setGrowthPercentage(25);

      const state = usePlanStore.getState();
      expect(state.plan?.growthPercentage).toBe(25);
    });

    it('should not throw when plan is null', () => {
      const { setGrowthPercentage } = usePlanStore.getState();

      expect(() => {
        setGrowthPercentage(25);
      }).not.toThrow();
    });
  });

  describe('setManualNetworkAddress', () => {
    it('should set manual network address and lock', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const { loadPlan, setManualNetworkAddress } = usePlanStore.getState();

      loadPlan(plan);
      setManualNetworkAddress(0, '10.1.0.0/26', true);

      const state = usePlanStore.getState();
      expect(state.plan?.subnets[0]?.manualNetworkAddress).toBe('10.1.0.0/26');
      expect(state.plan?.subnets[0]?.networkLocked).toBe(true);
    });

    it('should not throw when plan is null', () => {
      const { setManualNetworkAddress } = usePlanStore.getState();

      expect(() => {
        setManualNetworkAddress(0, '10.1.0.0/26', true);
      }).not.toThrow();
    });
  });

  describe('setNetworkLocked', () => {
    it('should set network locked status', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const { loadPlan, setNetworkLocked } = usePlanStore.getState();

      loadPlan(plan);
      setNetworkLocked(0, true);

      const state = usePlanStore.getState();
      expect(state.plan?.subnets[0]?.networkLocked).toBe(true);
    });

    it('should not throw when plan is null', () => {
      const { setNetworkLocked } = usePlanStore.getState();

      expect(() => {
        setNetworkLocked(0, true);
      }).not.toThrow();
    });
  });

  describe('clearPlan', () => {
    it('should clear plan and filename', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan, setCurrentFilename, clearPlan } = usePlanStore.getState();

      loadPlan(plan);
      setCurrentFilename('test.cidr');

      expect(usePlanStore.getState().plan).not.toBeNull();
      expect(usePlanStore.getState().currentFilename).not.toBeNull();

      clearPlan();

      const state = usePlanStore.getState();
      expect(state.plan).toBeNull();
      expect(state.currentFilename).toBeNull();
    });

    it('should not throw when already null', () => {
      const { clearPlan } = usePlanStore.getState();

      expect(() => {
        clearPlan();
      }).not.toThrow();

      const state = usePlanStore.getState();
      expect(state.plan).toBeNull();
      expect(state.currentFilename).toBeNull();
    });
  });

  describe('cascading operations', () => {
    it('should handle add -> calculate -> update workflow', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan, addSubnet, calculatePlan, updateSubnet } = usePlanStore.getState();

      loadPlan(plan);

      // Add subnet
      addSubnet(createSubnet('Engineering', 10, 50));
      expect(usePlanStore.getState().plan?.subnets).toHaveLength(1);

      // Calculate
      calculatePlan();
      expect(usePlanStore.getState().plan?.subnets[0]?.subnetInfo).toBeDefined();

      // Update
      updateSubnet(0, 'Updated Engineering', 10, 100);
      expect(usePlanStore.getState().plan?.subnets[0]?.name).toBe('Updated Engineering');
      expect(usePlanStore.getState().plan?.subnets[0]?.expectedDevices).toBe(100);
    });

    it('should handle multiple subnet additions and removals', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { loadPlan, addSubnet, removeSubnet } = usePlanStore.getState();

      loadPlan(plan);

      // Add three subnets
      addSubnet(createSubnet('Subnet 1', 10, 50));
      addSubnet(createSubnet('Subnet 2', 20, 25));
      addSubnet(createSubnet('Subnet 3', 30, 10));

      expect(usePlanStore.getState().plan?.subnets).toHaveLength(3);

      // Remove middle subnet
      const removed = removeSubnet(1);
      expect(removed?.name).toBe('Subnet 2');
      expect(usePlanStore.getState().plan?.subnets).toHaveLength(2);
      expect(usePlanStore.getState().plan?.subnets[1]?.name).toBe('Subnet 3');
    });

    it('should handle clear -> reload workflow', () => {
      const plan1 = createNetworkPlan('Plan 1', '10.0.0.0');
      const plan2 = createNetworkPlan('Plan 2', '192.168.0.0');

      const { loadPlan, clearPlan } = usePlanStore.getState();

      // Load first plan
      loadPlan(plan1);
      expect(usePlanStore.getState().plan?.name).toBe('Plan 1');

      // Clear
      clearPlan();
      expect(usePlanStore.getState().plan).toBeNull();

      // Load second plan
      loadPlan(plan2);
      expect(usePlanStore.getState().plan?.name).toBe('Plan 2');
    });
  });
});
