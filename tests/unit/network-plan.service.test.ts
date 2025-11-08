/**
 * Unit tests for NetworkPlanService
 */

import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { ValidationError } from '../../src/errors/network-plan-errors.js';
import { NetworkPlanService } from '../../src/services/network-plan.service.js';

describe('NetworkPlanService', () => {
  let service: NetworkPlanService;

  beforeEach(() => {
    service = new NetworkPlanService();
  });

  describe('calculatePlan', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.calculatePlan(null as any)).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.calculatePlan(null as any)).toThrow('Plan is null or undefined');
    });

    it('should throw error if plan has no subnets', () => {
      const plan = createNetworkPlan('Test Plan');
      expect(() => service.calculatePlan(plan)).toThrow(ValidationError);
      expect(() => service.calculatePlan(plan)).toThrow('No subnets defined');
    });

    it('should calculate subnet info for all subnets', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet1 = createSubnet('Engineering', 10, 50);
      const subnet2 = createSubnet('Marketing', 20, 25);
      plan.subnets.push(subnet1, subnet2);

      service.calculatePlan(plan);

      expect(plan.subnets[0].subnetInfo).toBeDefined();
      expect(plan.subnets[1].subnetInfo).toBeDefined();
      expect(plan.subnets[0].subnetInfo?.plannedDevices).toBe(100); // 50 × 2 (100% growth)
      expect(plan.subnets[1].subnetInfo?.plannedDevices).toBe(50); // 25 × 2 (100% growth)
    });

    it('should calculate supernet', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.calculatePlan(plan);

      expect(plan.supernet).toBeDefined();
      expect(plan.supernet?.cidrPrefix).toBeDefined();
      expect(plan.supernet?.totalSize).toBeDefined();
      expect(plan.supernet?.utilization).toBeDefined();
    });

    it('should allocate network addresses', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.calculatePlan(plan);

      expect(plan.subnets[0].subnetInfo?.networkAddress).toBeDefined();
      expect(plan.subnets[0].subnetInfo?.networkAddress).toMatch(/^10\.0\.\d+\.\d+\/\d+$/);
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      const originalTime = plan.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      setTimeout(() => {
        service.calculatePlan(plan);
        expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
      }, 10);
    });
  });

  describe('addSubnet', () => {
    it('should throw error if plan is null', () => {
      const subnet = createSubnet('Test', 10, 50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.addSubnet(null as any, subnet)).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.addSubnet(null as any, subnet)).toThrow('Plan is null or undefined');
    });

    it('should throw error if subnet is null', () => {
      const plan = createNetworkPlan('Test Plan');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.addSubnet(plan, null as any)).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.addSubnet(plan, null as any)).toThrow('Subnet is null or undefined');
    });

    it('should add subnet to plan', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet = createSubnet('Engineering', 10, 50);

      service.addSubnet(plan, subnet);

      expect(plan.subnets).toHaveLength(1);
      // Check properties instead of object identity (VLSM creates new objects)
      expect(plan.subnets[0].name).toBe('Engineering');
      expect(plan.subnets[0].vlanId).toBe(10);
      expect(plan.subnets[0].expectedDevices).toBe(50);
    });

    it('should automatically recalculate plan after adding subnet', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet = createSubnet('Engineering', 10, 50);

      service.addSubnet(plan, subnet);

      expect(plan.supernet).toBeDefined();
      expect(plan.subnets[0].subnetInfo).toBeDefined();
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      const originalTime = plan.updatedAt;
      const subnet = createSubnet('Engineering', 10, 50);

      service.addSubnet(plan, subnet);

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });

  describe('removeSubnet', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.removeSubnet(null as any, 0)).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.removeSubnet(null as any, 0)).toThrow('Plan is null or undefined');
    });

    it('should throw error if index is out of bounds', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      expect(() => service.removeSubnet(plan, -1)).toThrow(ValidationError);
      expect(() => service.removeSubnet(plan, -1)).toThrow('out of bounds');
      expect(() => service.removeSubnet(plan, 5)).toThrow(ValidationError);
      expect(() => service.removeSubnet(plan, 5)).toThrow('out of bounds');
    });

    it('should remove subnet at specified index', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet1 = createSubnet('Engineering', 10, 50);
      const subnet2 = createSubnet('Marketing', 20, 25);
      plan.subnets.push(subnet1, subnet2);

      // After adding, subnets are reordered by size (Engineering is larger)
      // Index 0: Engineering (128 addresses), Index 1: Marketing (64 addresses)
      const removed = service.removeSubnet(plan, 0);

      // Check properties instead of object identity
      expect(removed.name).toBe('Engineering'); // Engineering was at index 0 (larger)
      expect(plan.subnets).toHaveLength(1);
      expect(plan.subnets[0].name).toBe('Marketing'); // Marketing remains
    });

    it('should recalculate plan if subnets remain', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      plan.subnets.push(createSubnet('Marketing', 20, 25));
      service.calculatePlan(plan);

      service.removeSubnet(plan, 0);

      expect(plan.supernet).toBeDefined();
      expect(plan.subnets[0].subnetInfo).toBeDefined();
    });

    it('should clear supernet if no subnets remain', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      service.calculatePlan(plan);

      service.removeSubnet(plan, 0);

      expect(plan.subnets).toHaveLength(0);
      expect(plan.supernet).toBeUndefined();
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      const originalTime = plan.updatedAt;

      service.removeSubnet(plan, 0);

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });

  describe('updateBaseIp', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.updateBaseIp(null as any, '192.168.0.0')).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.updateBaseIp(null as any, '192.168.0.0')).toThrow(
        'Plan is null or undefined',
      );
    });

    it('should throw error if new IP is empty', () => {
      const plan = createNetworkPlan('Test Plan');
      expect(() => service.updateBaseIp(plan, '')).toThrow(ValidationError);
      expect(() => service.updateBaseIp(plan, '')).toThrow('IP address is empty');
      expect(() => service.updateBaseIp(plan, '   ')).toThrow(ValidationError);
    });

    it('should update base IP', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      service.updateBaseIp(plan, '192.168.0.0');

      expect(plan.baseIp).toBe('192.168.0.0');
    });

    it('should recalculate plan if subnets exist', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      service.calculatePlan(plan);

      const oldNetworkAddress = plan.subnets[0].subnetInfo?.networkAddress;

      service.updateBaseIp(plan, '192.168.0.0');

      expect(plan.subnets[0].subnetInfo?.networkAddress).toBeDefined();
      expect(plan.subnets[0].subnetInfo?.networkAddress).not.toBe(oldNetworkAddress);
      expect(plan.subnets[0].subnetInfo?.networkAddress).toMatch(/^192\.168\.\d+\.\d+\/\d+$/);
    });

    it('should not fail if no subnets exist', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      expect(() => service.updateBaseIp(plan, '192.168.0.0')).not.toThrow();
      expect(plan.baseIp).toBe('192.168.0.0');
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      const originalTime = plan.updatedAt;

      service.updateBaseIp(plan, '192.168.0.0');

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });

  describe('updateSubnet', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.updateSubnet(null as any, 0, 'Test', 10, 50)).toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.updateSubnet(null as any, 0, 'Test', 10, 50)).toThrow(
        'Plan is null or undefined',
      );
    });

    it('should throw error if index is out of bounds', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      expect(() => service.updateSubnet(plan, -1, 'Updated', 20, 100)).toThrow(ValidationError);
      expect(() => service.updateSubnet(plan, -1, 'Updated', 20, 100)).toThrow('out of bounds');
      expect(() => service.updateSubnet(plan, 5, 'Updated', 20, 100)).toThrow(ValidationError);
    });

    it('should update subnet properties', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.updateSubnet(plan, 0, 'Updated Engineering', 20, 100);

      expect(plan.subnets[0].name).toBe('Updated Engineering');
      expect(plan.subnets[0].vlanId).toBe(20);
      expect(plan.subnets[0].expectedDevices).toBe(100);
    });

    it('should automatically recalculate plan after update', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      service.calculatePlan(plan);

      const oldSubnetSize = plan.subnets[0].subnetInfo?.subnetSize;

      service.updateSubnet(plan, 0, 'Engineering', 10, 200);

      expect(plan.subnets[0].subnetInfo?.subnetSize).toBeDefined();
      expect(plan.subnets[0].subnetInfo?.subnetSize).not.toBe(oldSubnetSize);
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      const originalTime = plan.updatedAt;

      service.updateSubnet(plan, 0, 'Updated', 20, 100);

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });

  describe('setManualNetworkAddress', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.setManualNetworkAddress(null as any, 0, '10.0.0.0/24', true)).toThrow(
        ValidationError,
      );
    });

    it('should throw error if index is out of bounds', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      expect(() => service.setManualNetworkAddress(plan, 5, '10.0.0.0/24', true)).toThrow(
        ValidationError,
      );
      expect(() => service.setManualNetworkAddress(plan, 5, '10.0.0.0/24', true)).toThrow(
        'Index 5 is out of bounds',
      );
    });

    it('should throw error for invalid network address format', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      expect(() => service.setManualNetworkAddress(plan, 0, 'invalid', true)).toThrow(Error);
      expect(() => service.setManualNetworkAddress(plan, 0, 'invalid', true)).toThrow(
        'Invalid network address format',
      );
    });

    it('should set manual network address and lock subnet', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.setManualNetworkAddress(plan, 0, '10.0.1.0/24', true);

      expect(plan.subnets[0].manualNetworkAddress).toBe('10.0.1.0/24');
      expect(plan.subnets[0].networkLocked).toBe(true);
      expect(plan.subnets[0].subnetInfo?.networkAddress).toBe('10.0.1.0/24');
      expect(plan.subnets[0].subnetInfo?.cidrPrefix).toBe(24);
    });

    it('should set manual network address without locking', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.setManualNetworkAddress(plan, 0, '10.0.2.0/25', false);

      expect(plan.subnets[0].manualNetworkAddress).toBe('10.0.2.0/25');
      expect(plan.subnets[0].networkLocked).toBe(false);
      expect(plan.subnets[0].subnetInfo?.cidrPrefix).toBe(25);
    });

    it('should calculate correct subnet info for manual address', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.setManualNetworkAddress(plan, 0, '192.168.1.0/26', true);

      const subnetInfo = plan.subnets[0].subnetInfo;
      expect(subnetInfo?.networkAddress).toBe('192.168.1.0/26');
      expect(subnetInfo?.broadcastAddress).toBe('192.168.1.63');
      expect(subnetInfo?.usableHostRange.first).toBe('192.168.1.1');
      expect(subnetInfo?.usableHostRange.last).toBe('192.168.1.62');
      expect(subnetInfo?.totalHosts).toBe(64);
      expect(subnetInfo?.usableHosts).toBe(62);
    });

    it('should preserve existing subnet info fields', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet = createSubnet('Engineering', 10, 50);
      plan.subnets.push(subnet);

      // First calculate to set expectedDevices and plannedDevices
      service.calculatePlan(plan);
      const originalExpected = plan.subnets[0].subnetInfo?.expectedDevices;
      const originalPlanned = plan.subnets[0].subnetInfo?.plannedDevices;

      // Then set manual network address
      service.setManualNetworkAddress(plan, 0, '10.0.3.0/24', true);

      expect(plan.subnets[0].subnetInfo?.expectedDevices).toBe(originalExpected);
      expect(plan.subnets[0].subnetInfo?.plannedDevices).toBe(originalPlanned);
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      const originalTime = plan.updatedAt;

      service.setManualNetworkAddress(plan, 0, '10.0.4.0/24', true);

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });

    it('should handle /30 network address for point-to-point', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Point-to-Point', 10, 2));

      service.setManualNetworkAddress(plan, 0, '10.0.5.0/30', true);

      expect(plan.subnets[0].subnetInfo?.cidrPrefix).toBe(30);
      expect(plan.subnets[0].subnetInfo?.totalHosts).toBe(4);
      expect(plan.subnets[0].subnetInfo?.usableHosts).toBe(2);
    });

    it('should create subnet info if it does not exist', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet = createSubnet('Engineering', 10, 50);
      plan.subnets.push(subnet);

      // Don't call calculatePlan, so subnetInfo is undefined
      expect(subnet.subnetInfo).toBeUndefined();

      service.setManualNetworkAddress(plan, 0, '10.0.6.0/24', true);

      expect(plan.subnets[0].subnetInfo).toBeDefined();
      expect(plan.subnets[0].subnetInfo?.expectedDevices).toBe(50);
      expect(plan.subnets[0].subnetInfo?.networkAddress).toBe('10.0.6.0/24');
    });
  });

  describe('setNetworkLocked', () => {
    it('should throw error if plan is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.setNetworkLocked(null as any, 0, true)).toThrow(ValidationError);
    });

    it('should throw error if index is out of bounds', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      expect(() => service.setNetworkLocked(plan, 5, true)).toThrow(ValidationError);
      expect(() => service.setNetworkLocked(plan, 5, true)).toThrow('Index 5 is out of bounds');
    });

    it('should lock a subnet', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      service.setNetworkLocked(plan, 0, true);

      expect(plan.subnets[0].networkLocked).toBe(true);
    });

    it('should unlock a subnet', () => {
      const plan = createNetworkPlan('Test Plan');
      const subnet = createSubnet('Engineering', 10, 50);
      subnet.networkLocked = true;
      plan.subnets.push(subnet);

      service.setNetworkLocked(plan, 0, false);

      expect(plan.subnets[0].networkLocked).toBe(false);
    });

    it('should update plan updatedAt timestamp', () => {
      const plan = createNetworkPlan('Test Plan');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      const originalTime = plan.updatedAt;

      service.setNetworkLocked(plan, 0, true);

      expect(plan.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });
  });
});
