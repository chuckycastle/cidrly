/**
 * Unit tests for network-plan helper functions
 */

import {
  addSubnet,
  calculateSubnetRanges,
  createNetworkPlan,
  removeSubnet,
} from '../src/core/models/network-plan.js';

describe('Network Plan Helpers', () => {
  describe('addSubnet', () => {
    it('should add a subnet to an empty plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const updated = addSubnet(plan, {
        name: 'Engineering',
        vlan: 10,
        expectedDevices: 50,
      });

      expect(updated.subnets).toHaveLength(1);
      expect(updated.subnets[0].name).toBe('Engineering');
      expect(updated.subnets[0].vlanId).toBe(10);
      expect(updated.subnets[0].expectedDevices).toBe(50);
      expect(updated.subnets[0].id).toMatch(/^subnet-/);
    });

    it('should add multiple subnets', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });
      plan = addSubnet(plan, { name: 'Marketing', vlan: 20, expectedDevices: 30 });

      expect(plan.subnets).toHaveLength(2);
      expect(plan.subnets[0].name).toBe('Engineering');
      expect(plan.subnets[1].name).toBe('Marketing');
    });

    it('should update the updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const originalUpdate = plan.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      const updated = addSubnet(plan, {
        name: 'Engineering',
        vlan: 10,
        expectedDevices: 50,
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdate.getTime());
    });
  });

  describe('removeSubnet', () => {
    it('should remove a subnet by ID', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });
      plan = addSubnet(plan, { name: 'Marketing', vlan: 20, expectedDevices: 30 });

      const subnetId = plan.subnets[0].id;
      const updated = removeSubnet(plan, subnetId);

      expect(updated.subnets).toHaveLength(1);
      expect(updated.subnets[0].name).toBe('Marketing');
    });

    it('should handle removing from a plan with one subnet', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });

      const subnetId = plan.subnets[0].id;
      const updated = removeSubnet(plan, subnetId);

      expect(updated.subnets).toHaveLength(0);
    });

    it('should not remove anything if ID does not exist', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });

      const updated = removeSubnet(plan, 'non-existent-id');

      expect(updated.subnets).toHaveLength(1);
      expect(updated.subnets[0].name).toBe('Engineering');
    });

    it('should update the updatedAt timestamp', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });
      const originalUpdate = plan.updatedAt;

      const subnetId = plan.subnets[0].id;
      const updated = removeSubnet(plan, subnetId);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdate.getTime());
    });
  });

  describe('calculateSubnetRanges', () => {
    it('should calculate IP ranges for subnets', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });
      plan = addSubnet(plan, { name: 'Marketing', vlan: 20, expectedDevices: 30 });

      const calculated = calculateSubnetRanges(plan);

      expect(calculated.subnets[0].subnetInfo).toBeDefined();
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBeDefined();
      expect(calculated.subnets[0].subnetInfo?.cidrPrefix).toBeDefined();
      expect(calculated.subnets[1].subnetInfo).toBeDefined();
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBeDefined();
    });

    it('should calculate supernet information', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Engineering', vlan: 10, expectedDevices: 50 });
      plan = addSubnet(plan, { name: 'Marketing', vlan: 20, expectedDevices: 30 });

      const calculated = calculateSubnetRanges(plan);

      expect(calculated.supernet).toBeDefined();
      expect(calculated.supernet?.cidrPrefix).toBeDefined();
      expect(calculated.supernet?.efficiency).toBeGreaterThan(0);
      expect(calculated.supernet?.efficiency).toBeLessThanOrEqual(100);
      expect(calculated.supernet?.networkAddress).toBeDefined();
    });

    it('should handle empty subnet list', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const calculated = calculateSubnetRanges(plan);

      expect(calculated.subnets).toHaveLength(0);
      expect(calculated.supernet).toBeUndefined();
    });

    it('should allocate sequential IP ranges', () => {
      let plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan = addSubnet(plan, { name: 'Subnet1', vlan: 10, expectedDevices: 50 });
      plan = addSubnet(plan, { name: 'Subnet2', vlan: 20, expectedDevices: 30 });

      const calculated = calculateSubnetRanges(plan);

      const range1 = calculated.subnets[0].subnetInfo?.networkAddress || '';
      const range2 = calculated.subnets[1].subnetInfo?.networkAddress || '';

      // Should start with base IP
      expect(range1).toMatch(/^10\.0\.0\./);
      // Second subnet should have a different address
      expect(range2).toMatch(/^10\.0\.0\./);
      expect(range1).not.toBe(range2);
    });
  });
});
