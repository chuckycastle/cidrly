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

  describe('regression tests', () => {
    /**
     * Regression test for: TypeError: Cannot assign to read only property 'subnets'
     *
     * Root cause: NetworkPlanService methods were mutating plan objects in-place,
     * but Zustand's Immer middleware freezes state objects after set().
     * On second invocation, the frozen object caused mutation errors.
     *
     * Fix: Refactored service layer to return new plan objects (functional pattern).
     */
    it('should handle add → calc → add → calc without crash (double-invocation bug)', () => {
      const plan = createNetworkPlan('Regression Test', '10.0.0.0');
      const { loadPlan, addSubnet, calculatePlan } = usePlanStore.getState();

      loadPlan(plan);

      // First cycle: add + calc
      const subnet1 = createSubnet('Subnet 1', 10, 50);
      expect(() => addSubnet(subnet1)).not.toThrow();
      expect(() => calculatePlan()).not.toThrow();

      expect(usePlanStore.getState().plan?.subnets).toHaveLength(1);
      expect(usePlanStore.getState().plan?.supernet).toBeDefined();

      // Second cycle: add + calc (this was the crash scenario)
      const subnet2 = createSubnet('Subnet 2', 20, 25);
      expect(() => addSubnet(subnet2)).not.toThrow();
      expect(() => calculatePlan()).not.toThrow();

      expect(usePlanStore.getState().plan?.subnets).toHaveLength(2);
      expect(usePlanStore.getState().plan?.supernet).toBeDefined();
    });

    it('should handle multiple rapid operations without crash', () => {
      const plan = createNetworkPlan('Rapid Operations Test', '172.16.0.0');
      const { loadPlan, addSubnet, calculatePlan, updateBaseIp, setGrowthPercentage } =
        usePlanStore.getState();

      loadPlan(plan);

      // Multiple rapid operations
      expect(() => {
        addSubnet(createSubnet('A', 10, 50));
        calculatePlan();
        addSubnet(createSubnet('B', 20, 25));
        calculatePlan();
        updateBaseIp('10.0.0.0');
        calculatePlan();
        setGrowthPercentage(50);
        calculatePlan();
        addSubnet(createSubnet('C', 30, 100));
        calculatePlan();
      }).not.toThrow();

      expect(usePlanStore.getState().plan?.subnets).toHaveLength(3);
      expect(usePlanStore.getState().plan?.baseIp).toBe('10.0.0.0');
      expect(usePlanStore.getState().plan?.growthPercentage).toBe(50);
    });

    /**
     * Regression test for: Inconsistent network allocation on repeated calculatePlan()
     *
     * Root cause: allocateSubnetAddresses() started from baseIp without knowledge
     * of locked subnet positions. After first calculate, all subnets are positioned
     * via VLSM (largest first). On second calculate, unlocked subnets were
     * reallocated from baseIp, ignoring where locked subnets were positioned.
     *
     * Fix: Pass occupied ranges from locked subnets to allocateSubnetAddresses()
     * so unlocked subnets are allocated into available gaps.
     */
    it('should maintain consistent allocation on repeated calculatePlan calls', () => {
      const plan = createNetworkPlan('VLSM Consistency Test', '10.0.0.0');
      const { loadPlan, addSubnet, calculatePlan } = usePlanStore.getState();

      loadPlan(plan);

      // Add a large subnet and a small subnet
      addSubnet(createSubnet('Large', 10, 200)); // Will get larger /24
      addSubnet(createSubnet('Small', 20, 10)); // Will get smaller /27

      // First calculate - VLSM positions subnets
      calculatePlan();

      // Get addresses after first calculation
      const state1 = usePlanStore.getState();
      const largeAddr1 = state1.plan?.subnets.find((s) => s.name === 'Large')?.subnetInfo
        ?.networkAddress;
      const smallAddr1 = state1.plan?.subnets.find((s) => s.name === 'Small')?.subnetInfo
        ?.networkAddress;

      // Second calculate - should maintain same positions
      calculatePlan();

      // Get addresses after second calculation
      const state2 = usePlanStore.getState();
      const largeAddr2 = state2.plan?.subnets.find((s) => s.name === 'Large')?.subnetInfo
        ?.networkAddress;
      const smallAddr2 = state2.plan?.subnets.find((s) => s.name === 'Small')?.subnetInfo
        ?.networkAddress;

      // Both subnets should have the same addresses after repeated calculation
      expect(largeAddr1).toBe(largeAddr2);
      expect(smallAddr1).toBe(smallAddr2);

      // Third calculate - still consistent
      calculatePlan();

      const state3 = usePlanStore.getState();
      const largeAddr3 = state3.plan?.subnets.find((s) => s.name === 'Large')?.subnetInfo
        ?.networkAddress;
      const smallAddr3 = state3.plan?.subnets.find((s) => s.name === 'Small')?.subnetInfo
        ?.networkAddress;

      expect(largeAddr1).toBe(largeAddr3);
      expect(smallAddr1).toBe(smallAddr3);
    });

    it('should allocate new subnet around existing locked subnets', () => {
      const plan = createNetworkPlan('Locked Subnet Test', '10.0.0.0');
      const { loadPlan, addSubnet, calculatePlan, setNetworkLocked, setGrowthPercentage } =
        usePlanStore.getState();

      loadPlan(plan);

      // Use 0% growth for predictable subnet sizes
      setGrowthPercentage(0);

      // Add and calculate first subnet
      addSubnet(createSubnet('First', 10, 100)); // 100 devices + 0% growth = 100 → /25 - 128 addresses
      calculatePlan();

      // Lock the first subnet to preserve its address
      setNetworkLocked(0, true);

      // Get the first subnet's address
      const firstAddr = usePlanStore.getState().plan?.subnets[0]?.subnetInfo?.networkAddress;
      expect(firstAddr).toBe('10.0.0.0/25');

      // Add a second subnet and calculate
      addSubnet(createSubnet('Second', 20, 50)); // 50 devices + 0% growth = 50 → /26 - 64 addresses
      calculatePlan();

      // First subnet should still be at 10.0.0.0/25 (locked)
      const state = usePlanStore.getState();
      const firstAfter = state.plan?.subnets.find((s) => s.name === 'First')?.subnetInfo
        ?.networkAddress;
      const secondAddr = state.plan?.subnets.find((s) => s.name === 'Second')?.subnetInfo
        ?.networkAddress;

      expect(firstAfter).toBe('10.0.0.0/25');
      // Second subnet should be allocated after the first (10.0.0.128/26)
      expect(secondAddr).toBe('10.0.0.128/26');
    });

    /**
     * Regression test for: Locked subnets + new unlocked + repeated calculation
     *
     * Scenario from user bug report:
     * 1. Plan saved with 12 locked subnets (each has subnetInfo with networkAddress)
     * 2. Plan reloaded
     * 3. New unlocked subnet added (e.g., "rdlab")
     * 4. First calculate → new subnet gets correct position after locked subnets
     * 5. Second calculate → new subnet should KEEP same position (bug was: it moved to baseIp)
     */
    it('should maintain consistent allocation on repeated calculate with locked subnets', () => {
      const plan = createNetworkPlan('Locked + New + Repeat Test', '10.0.0.0');
      const { loadPlan, addSubnet, calculatePlan, setNetworkLocked, setGrowthPercentage } =
        usePlanStore.getState();

      loadPlan(plan);
      setGrowthPercentage(0);

      // Add multiple subnets and calculate
      addSubnet(createSubnet('Large1', 10, 200)); // /24 - 256 addresses
      addSubnet(createSubnet('Large2', 20, 180)); // /24 - 256 addresses
      addSubnet(createSubnet('Medium', 30, 100)); // /25 - 128 addresses
      calculatePlan();

      // Lock all existing subnets (simulating save/reload)
      setNetworkLocked(0, true);
      setNetworkLocked(1, true);
      setNetworkLocked(2, true);

      // Get locked subnet addresses
      const state1 = usePlanStore.getState();
      const large1Addr = state1.plan?.subnets.find((s) => s.name === 'Large1')?.subnetInfo
        ?.networkAddress;
      const large2Addr = state1.plan?.subnets.find((s) => s.name === 'Large2')?.subnetInfo
        ?.networkAddress;
      const mediumAddr = state1.plan?.subnets.find((s) => s.name === 'Medium')?.subnetInfo
        ?.networkAddress;

      expect(large1Addr).toBe('10.0.0.0/24');
      expect(large2Addr).toBe('10.0.1.0/24');
      expect(mediumAddr).toBe('10.0.2.0/25');

      // Add a new unlocked subnet
      addSubnet(createSubnet('NewSmall', 40, 10)); // /28 - 16 addresses

      // First calculate with new subnet
      calculatePlan();

      const state2 = usePlanStore.getState();
      const newAddr1 = state2.plan?.subnets.find((s) => s.name === 'NewSmall')?.subnetInfo
        ?.networkAddress;

      // NewSmall should be allocated AFTER the locked subnets
      expect(newAddr1).toBe('10.0.2.128/28');

      // Second calculate - THIS IS THE BUG TEST
      // Before fix: NewSmall would go back to 10.0.0.0/28 (overlapping with Large1!)
      calculatePlan();

      const state3 = usePlanStore.getState();
      const newAddr2 = state3.plan?.subnets.find((s) => s.name === 'NewSmall')?.subnetInfo
        ?.networkAddress;

      // NewSmall should maintain same position
      expect(newAddr2).toBe(newAddr1);

      // Verify locked subnets are unchanged
      const large1After = state3.plan?.subnets.find((s) => s.name === 'Large1')?.subnetInfo
        ?.networkAddress;
      const large2After = state3.plan?.subnets.find((s) => s.name === 'Large2')?.subnetInfo
        ?.networkAddress;
      const mediumAfter = state3.plan?.subnets.find((s) => s.name === 'Medium')?.subnetInfo
        ?.networkAddress;

      expect(large1After).toBe(large1Addr);
      expect(large2After).toBe(large2Addr);
      expect(mediumAfter).toBe(mediumAddr);
    });

    /**
     * Test for IPAM allocation: Plans with assigned blocks should allocate
     * new subnets within the assigned block range, not at baseIp.
     *
     * Scenario:
     * - baseIp = 10.0.0.0 (default)
     * - Assigned blocks in 10.1.241.0/24 range
     * - Locked subnets already allocated within assigned blocks
     * - New subnet should be allocated within assigned blocks (not at 10.0.0.0)
     */
    it('should allocate new subnets within assigned blocks range, not at baseIp', () => {
      const plan = createNetworkPlan('IPAM Test', '10.0.0.0');

      // Add assigned blocks (simulating IPAM allocation)
      // 10.1.241.0 = 10*16777216 + 1*65536 + 241*256 + 0 = 167899392
      plan.assignedBlocks = [
        {
          id: 'block-1',
          networkAddress: '10.1.241.0/24',
          cidrPrefix: 24,
          totalCapacity: 256,
          startInt: 167899392, // ipToInt('10.1.241.0')
          endInt: 167899647, // ipToInt('10.1.241.255')
          assignedAt: new Date(),
        },
        {
          id: 'block-2',
          networkAddress: '10.1.242.0/24',
          cidrPrefix: 24,
          totalCapacity: 256,
          startInt: 167899648, // ipToInt('10.1.242.0')
          endInt: 167899903, // ipToInt('10.1.242.255')
          assignedAt: new Date(),
        },
      ];

      const { loadPlan, addSubnet, calculatePlan, setNetworkLocked, setGrowthPercentage } =
        usePlanStore.getState();

      loadPlan(plan);
      setGrowthPercentage(0);

      // Add a subnet and calculate (will be in assigned block range)
      addSubnet(createSubnet('Existing', 10, 100)); // /25 - 128 addresses
      calculatePlan();

      // Lock the existing subnet
      setNetworkLocked(0, true);

      // Verify it's in the assigned block range
      const state1 = usePlanStore.getState();
      const existingAddr = state1.plan?.subnets.find((s) => s.name === 'Existing')?.subnetInfo
        ?.networkAddress;
      expect(existingAddr).toBe('10.1.241.0/25'); // Should be in first assigned block

      // Add a new subnet
      addSubnet(createSubnet('NewSubnet', 20, 30)); // 30 devices + 0% growth = /27 (32 addresses)
      calculatePlan();

      // New subnet should be allocated within assigned blocks range (after locked subnet)
      // NOT at 10.0.0.0 (the baseIp)
      const state2 = usePlanStore.getState();
      const newAddr = state2.plan?.subnets.find((s) => s.name === 'NewSubnet')?.subnetInfo
        ?.networkAddress;

      // Should be 10.1.241.128/27 (after the locked /25 at 10.1.241.0)
      expect(newAddr).toBe('10.1.241.128/27');

      // Verify it's NOT at baseIp
      expect(newAddr).not.toBe('10.0.0.0/27');

      // Second calculate should maintain position
      calculatePlan();
      const state3 = usePlanStore.getState();
      const newAddrAfter = state3.plan?.subnets.find((s) => s.name === 'NewSubnet')?.subnetInfo
        ?.networkAddress;
      expect(newAddrAfter).toBe(newAddr);
    });

    /**
     * Test for allocation stability with gaps in IP space.
     *
     * Scenario:
     * - Multiple locked subnets with gaps between them
     * - New subnet added should find first available gap
     * - Allocation should be STABLE across repeated calculates (no oscillation)
     */
    it('should produce stable allocation across multiple calculates when gaps exist', () => {
      const plan = createNetworkPlan('Gap Stability Test', '10.0.0.0');

      // Create locked subnets with a gap in the middle
      // 10.0.0.0/25 (0-127), then gap at 10.0.0.128-255, then 10.0.1.0/25 (256-383)
      plan.assignedBlocks = [
        {
          id: 'block-1',
          networkAddress: '10.0.0.0/23',
          cidrPrefix: 23,
          totalCapacity: 512,
          startInt: 167772160, // ipToInt('10.0.0.0')
          endInt: 167772671, // ipToInt('10.0.1.255')
          assignedAt: new Date(),
        },
      ];

      const { loadPlan, addSubnet, calculatePlan, setNetworkLocked, setGrowthPercentage } =
        usePlanStore.getState();

      loadPlan(plan);
      setGrowthPercentage(0);

      // Add two subnets that will create a gap
      addSubnet(createSubnet('First', 10, 100)); // /25 at 10.0.0.0
      addSubnet(createSubnet('Third', 30, 100)); // /25 - will be at 10.0.1.0 after sort by size
      calculatePlan();

      // Lock both subnets
      setNetworkLocked(0, true);
      setNetworkLocked(1, true);

      // Verify positions
      const state1 = usePlanStore.getState();
      const firstAddr = state1.plan?.subnets.find((s) => s.name === 'First')?.subnetInfo
        ?.networkAddress;
      const thirdAddr = state1.plan?.subnets.find((s) => s.name === 'Third')?.subnetInfo
        ?.networkAddress;

      // Both are /25, so they'll be allocated sequentially
      expect(firstAddr).toBe('10.0.0.0/25');
      expect(thirdAddr).toBe('10.0.0.128/25');

      // Now add a new subnet that fits in a gap (if one existed) or after
      addSubnet(createSubnet('NewSubnet', 20, 30)); // /27 (32 addresses)

      // Calculate multiple times - all should produce same address
      calculatePlan();
      const addr1 = usePlanStore.getState().plan?.subnets.find((s) => s.name === 'NewSubnet')
        ?.subnetInfo?.networkAddress;

      calculatePlan();
      const addr2 = usePlanStore.getState().plan?.subnets.find((s) => s.name === 'NewSubnet')
        ?.subnetInfo?.networkAddress;

      calculatePlan();
      const addr3 = usePlanStore.getState().plan?.subnets.find((s) => s.name === 'NewSubnet')
        ?.subnetInfo?.networkAddress;

      calculatePlan();
      const addr4 = usePlanStore.getState().plan?.subnets.find((s) => s.name === 'NewSubnet')
        ?.subnetInfo?.networkAddress;

      // All addresses should be identical - no oscillation
      expect(addr1).toBe(addr2);
      expect(addr2).toBe(addr3);
      expect(addr3).toBe(addr4);

      // Address should be in the assigned blocks range
      expect(addr1).toMatch(/^10\.0\./);
    });
  });
});
