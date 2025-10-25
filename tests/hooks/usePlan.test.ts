/**
 * Tests for usePlan custom hooks
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { usePlan, usePlanActions, useSubnets } from '../../src/hooks/usePlan.js';
import { usePlanStore } from '../../src/store/planStore.js';

describe('usePlan hooks', () => {
  beforeEach(() => {
    // Clear store before each test
    const store = usePlanStore.getState();
    store.clearPlan();
  });

  describe('usePlan', () => {
    it('should return null when no plan is loaded', () => {
      const { result } = renderHook(() => usePlan());
      expect(result.current).toBeNull();
    });

    it('should return the loaded plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { result: loadResult } = renderHook(() => usePlanActions());
      const { result: planResult } = renderHook(() => usePlan());

      act(() => {
        loadResult.current.loadPlan(plan);
      });

      expect(planResult.current).toEqual(plan);
      expect(planResult.current?.name).toBe('Test Plan');
      expect(planResult.current?.baseIp).toBe('10.0.0.0');
    });
  });

  describe('useSubnets', () => {
    it('should return empty array when no plan is loaded', () => {
      const { result } = renderHook(() => useSubnets());
      expect(result.current).toEqual([]);
    });

    it('should return empty array when plan has no subnets', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const { result: loadResult } = renderHook(() => usePlanActions());
      const { result: subnetsResult } = renderHook(() => useSubnets());

      act(() => {
        loadResult.current.loadPlan(plan);
      });

      expect(subnetsResult.current).toEqual([]);
    });

    it('should return subnets array when plan has subnets', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet1 = createSubnet('VLAN 10', 10, 50);
      const subnet2 = createSubnet('VLAN 20', 20, 100);
      plan.subnets = [subnet1, subnet2];

      const { result: loadResult } = renderHook(() => usePlanActions());
      const { result: subnetsResult } = renderHook(() => useSubnets());

      act(() => {
        loadResult.current.loadPlan(plan);
      });

      expect(subnetsResult.current).toHaveLength(2);
      expect(subnetsResult.current[0]?.name).toBe('VLAN 10');
      expect(subnetsResult.current[1]?.name).toBe('VLAN 20');
    });
  });

  describe('usePlanActions', () => {
    it('should provide loadPlan action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.loadPlan).toBeInstanceOf(Function);
    });

    it('should provide addSubnet action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.addSubnet).toBeInstanceOf(Function);
    });

    it('should provide updateSubnet action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.updateSubnet).toBeInstanceOf(Function);
    });

    it('should provide removeSubnet action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.removeSubnet).toBeInstanceOf(Function);
    });

    it('should provide calculatePlan action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.calculatePlan).toBeInstanceOf(Function);
    });

    it('should provide updateBaseIp action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.updateBaseIp).toBeInstanceOf(Function);
    });

    it('should provide clearPlan action', () => {
      const { result } = renderHook(() => usePlanActions());
      expect(result.current.clearPlan).toBeInstanceOf(Function);
    });

    it('should add subnet to plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet = createSubnet('VLAN 10', 10, 50);

      const { result: actionsResult } = renderHook(() => usePlanActions());
      const { result: subnetsResult } = renderHook(() => useSubnets());

      act(() => {
        actionsResult.current.loadPlan(plan);
      });

      expect(subnetsResult.current).toHaveLength(0);

      act(() => {
        actionsResult.current.addSubnet(subnet);
      });

      expect(subnetsResult.current).toHaveLength(1);
      expect(subnetsResult.current[0]?.name).toBe('VLAN 10');
    });

    it('should update base IP', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      const { result: actionsResult } = renderHook(() => usePlanActions());
      const { result: planResult } = renderHook(() => usePlan());

      act(() => {
        actionsResult.current.loadPlan(plan);
      });

      expect(planResult.current?.baseIp).toBe('10.0.0.0');

      act(() => {
        actionsResult.current.updateBaseIp('192.168.1.0');
      });

      expect(planResult.current?.baseIp).toBe('192.168.1.0');
    });

    it('should clear plan', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      const { result: actionsResult } = renderHook(() => usePlanActions());
      const { result: planResult } = renderHook(() => usePlan());

      act(() => {
        actionsResult.current.loadPlan(plan);
      });

      expect(planResult.current).not.toBeNull();

      act(() => {
        actionsResult.current.clearPlan();
      });

      expect(planResult.current).toBeNull();
    });
  });
});
