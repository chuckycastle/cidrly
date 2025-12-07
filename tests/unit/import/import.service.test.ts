/**
 * Import Service Tests
 */

import { importService } from '../../../src/services/import/import.service.js';

describe('ImportService', () => {
  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = importService.getSupportedFormats();

      expect(formats).toContainEqual(
        expect.objectContaining({
          id: 'csv',
          name: 'CSV (Comma Separated Values)',
        }),
      );
      expect(formats).toContainEqual(
        expect.objectContaining({
          id: 'yaml',
          name: 'YAML Configuration',
        }),
      );
      expect(formats).toContainEqual(
        expect.objectContaining({
          id: 'cisco-ios',
          name: 'Cisco IOS/IOS-XE',
        }),
      );
    });
  });

  describe('detectFormat', () => {
    it('should detect CSV format', () => {
      const content = 'name,vlan,devices\nServer,10,50';
      expect(importService.detectFormat(content)).toBe('csv');
    });

    it('should detect YAML format', () => {
      const content = `subnets:
  - name: Server
    vlanId: 10`;
      expect(importService.detectFormat(content)).toBe('yaml');
    });

    it('should detect Cisco IOS format', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(importService.detectFormat(content)).toBe('cisco-ios');
    });

    it('should return undefined for unknown format', () => {
      const content = 'random text that matches nothing';
      expect(importService.detectFormat(content)).toBeUndefined();
    });
  });

  describe('importFromContent', () => {
    it('should parse CSV and create plan', async () => {
      const content = `name,vlan,devices,description
Server VLAN,10,50,Production servers
Client VLAN,20,100,Desktop clients`;

      const result = await importService.importFromContent(content, 'csv');

      expect(result.parseResult.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan?.subnets).toHaveLength(2);
      expect(result.importResult?.success).toBe(true);
      expect(result.importResult?.importedCount).toBe(2);
    });

    it('should use custom plan name', async () => {
      const content = `name,vlan,devices
Server,10,50`;

      const result = await importService.importFromContent(content, 'csv', {
        options: { planName: 'My Custom Plan' },
      });

      expect(result.plan?.name).toBe('My Custom Plan');
    });

    it('should use custom base IP', async () => {
      const content = `name,vlan,devices
Server,10,50`;

      const result = await importService.importFromContent(content, 'csv', {
        options: { baseIp: '172.16.0.0' },
      });

      expect(result.plan?.baseIp).toBe('172.16.0.0');
    });

    it('should skip duplicate VLANs when configured', async () => {
      const content = `name,vlan,devices
Server,10,50
Duplicate,10,100
Client,20,75`;

      const result = await importService.importFromContent(content, 'csv', {
        options: { skipDuplicateVlans: true },
      });

      expect(result.plan?.subnets).toHaveLength(2);
      expect(result.plan?.subnets[0].vlanId).toBe(10);
      expect(result.plan?.subnets[1].vlanId).toBe(20);
    });

    it('should return error for unknown format', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await importService.importFromContent('test', 'unknown-format' as any);

      expect(result.parseResult.success).toBe(false);
      expect(result.parseResult.errors[0].message).toContain('Unknown format');
    });

    it('should return parse result when parsing fails', async () => {
      const content = 'foo,bar,baz\n1,2,3';

      const result = await importService.importFromContent(content, 'csv');

      expect(result.parseResult.success).toBe(false);
      expect(result.plan).toBeUndefined();
    });
  });

  describe('importFromContent - merge mode', () => {
    it('should merge subnets into existing plan', async () => {
      const content = `name,vlan,devices
New Subnet,30,50`;

      const existingPlan = {
        id: 'test-plan',
        name: 'Existing Plan',
        baseIp: '10.0.0.0',
        subnets: [
          {
            id: 'existing-1',
            name: 'Existing',
            vlanId: 10,
            expectedDevices: 25,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await importService.importFromContent(content, 'csv', {
        options: { mode: 'merge' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingPlan: existingPlan as any,
      });

      expect(result.importResult?.success).toBe(true);
      expect(result.importResult?.importedCount).toBe(1);
      expect(result.plan?.subnets).toHaveLength(2);
    });

    it('should skip existing VLANs in merge mode', async () => {
      const content = `name,vlan,devices
Duplicate,10,50
New,20,75`;

      const existingPlan = {
        id: 'test-plan',
        name: 'Existing Plan',
        baseIp: '10.0.0.0',
        subnets: [
          {
            id: 'existing-1',
            name: 'Existing',
            vlanId: 10,
            expectedDevices: 25,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await importService.importFromContent(content, 'csv', {
        options: { mode: 'merge' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingPlan: existingPlan as any,
      });

      expect(result.importResult?.importedCount).toBe(1);
      expect(result.importResult?.skippedCount).toBe(1);
      expect(result.importResult?.warnings).toContainEqual(expect.stringContaining('VLAN 10'));
    });

    it('should override existing VLANs when configured', async () => {
      const content = `name,vlan,devices
Updated,10,100`;

      const existingPlan = {
        id: 'test-plan',
        name: 'Existing Plan',
        baseIp: '10.0.0.0',
        subnets: [
          {
            id: 'existing-1',
            name: 'Original',
            vlanId: 10,
            expectedDevices: 25,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await importService.importFromContent(content, 'csv', {
        options: { mode: 'merge', overrideExisting: true },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingPlan: existingPlan as any,
      });

      expect(result.importResult?.importedCount).toBe(1);
      expect(result.importResult?.skippedCount).toBe(0);
      expect(result.plan?.subnets[0].name).toBe('Updated');
    });

    it('should return error when merge mode has no existing plan', async () => {
      const content = `name,vlan,devices
Test,10,50`;

      const result = await importService.importFromContent(content, 'csv', {
        options: { mode: 'merge' },
      });

      expect(result.importResult?.success).toBe(false);
      expect(result.importResult?.error).toContain('existing plan');
    });
  });
});
