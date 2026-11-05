/**
 * Hardening follow-up tests
 *
 * Covers the audit hardening items that are not part of a confirmed finding:
 * plan loading by extension, shared plan-name sanitizing, home-directory expansion,
 * VLAN name fallback, YAML scalar unescaping, the Ubiquiti parser scan, the
 * `__proto__` key and subnet cap in the plan schema, quiet preference loading,
 * and symbolic-link handling in the install script.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import { createNetworkPlan } from '../../src/core/models/network-plan.js';
import { sanitizeVlanName } from '../../src/formatters/vendors/utils.js';
import { getDirectory } from '../../src/infrastructure/config/validation-rules.js';
import { parseNetworkPlan } from '../../src/schemas/network-plan.schema.js';
import { sanitizePlanName } from '../../src/services/export.service.js';
import { FileService } from '../../src/services/file.service.js';
import { ubiquitiParser } from '../../src/services/import/parsers/router/ubiquiti.parser.js';
import { yamlParser } from '../../src/services/import/parsers/yaml.parser.js';
import { PreferencesService } from '../../src/services/preferences.service.js';

const DATE = '2026-01-01T00:00:00.000Z';

describe('FileService.loadPlan extensions', () => {
  let tempDir: string;
  let service: FileService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-load-'));
    service = new FileService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads a plan saved with the default .cidr extension by its full name', async () => {
    await service.savePlan(createNetworkPlan('Campus'), 'campus');
    expect(fs.existsSync(path.join(tempDir, 'campus.cidr'))).toBe(true);
    const plan = await service.loadPlan('campus.cidr');
    expect(plan.name).toBe('Campus');
  });

  it('falls back to .cidr when a bare name has no .json file', async () => {
    await service.savePlan(createNetworkPlan('Campus'), 'campus');
    const plan = await service.loadPlan('campus');
    expect(plan.name).toBe('Campus');
  });

  it('prefers .json for a bare name when both files exist', async () => {
    await service.savePlan(createNetworkPlan('From cidr'), 'both.cidr');
    await service.savePlan(createNetworkPlan('From json'), 'both.json');
    const plan = await service.loadPlan('both');
    expect(plan.name).toBe('From json');
  });

  it('reports the .json path when neither file exists', async () => {
    await expect(service.loadPlan('missing')).rejects.toThrow('File not found');
    await expect(service.loadPlan('missing')).rejects.toThrow('missing.json');
  });
});

describe('sanitizePlanName', () => {
  it('reduces a plan name to a filename stem', () => {
    expect(sanitizePlanName('Corporate Network')).toBe('corporate-network');
    expect(sanitizePlanName('/tmp/evil')).toBe('tmp-evil');
    expect(sanitizePlanName('~/planted dir/x')).toBe('planted-dir-x');
    expect(sanitizePlanName('../../etc/passwd')).toBe('etc-passwd');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(sanitizePlanName('///')).toBe('');
  });
});

describe('getDirectory home expansion', () => {
  it('expands ~ and ~/ only', () => {
    expect(getDirectory('saved', '~/plans')).toBe(path.join(os.homedir(), 'plans'));
    expect(getDirectory('saved', '~')).toBe(os.homedir());
    expect(getDirectory('saved', '~other/plans')).toBe('~other/plans');
    expect(getDirectory('exports', '/abs/exports')).toBe('/abs/exports');
  });

  it('uses the home directory for defaults', () => {
    expect(getDirectory('saved')).toBe(path.join(os.homedir(), 'cidrly', 'saved-plans'));
    expect(getDirectory('exports')).toBe(path.join(os.homedir(), 'cidrly', 'exports'));
  });
});

describe('sanitizeVlanName fallback', () => {
  it('keeps a usable name', () => {
    expect(sanitizeVlanName('Guest WiFi')).toBe('Guest_WiFi');
  });

  it('uses the fallback when nothing usable remains', () => {
    expect(sanitizeVlanName('***')).toBe('VLAN');
    expect(sanitizeVlanName('@@@', 32, 'VLAN20')).toBe('VLAN20');
  });
});

describe('YAML scalar unescaping', () => {
  it('unescapes double-quoted names written by the YAML export', () => {
    const result = yamlParser.parse(
      'name: "Plan \\"A\\""\nbaseIp: 10.0.0.0\nsubnets:\n  - name: "Dev \\"Primary\\""\n    vlanId: 10\n    devices: 50\n',
    );
    expect(result.detectedPlanName).toBe('Plan "A"');
    expect(result.subnets[0]!.name).toBe('Dev "Primary"');
  });

  it('unescapes doubled quotes in single-quoted scalars', () => {
    const result = yamlParser.parse(
      "subnets:\n  - name: 'it''s here'\n    vlanId: 10\n    devices: 50\n",
    );
    expect(result.subnets[0]!.name).toBe("it's here");
  });

  it('drops control characters introduced by escape sequences', () => {
    const result = yamlParser.parse(
      'subnets:\n  - name: "eng\\nresource"\n    vlanId: 10\n    devices: 50\n',
    );
    expect(result.subnets[0]!.name).toBe('engresource');
  });
});

describe('Ubiquiti parser balanced-brace scan', () => {
  const config = `interfaces {
    ethernet eth1 {
        vif 10 {
            address 10.0.10.1/24
            description "Users"
            firewall {
                in {
                    name LAN_IN
                }
            }
        }
        vif 20 {
            address 10.0.20.1/24
        }
    }
}`;

  it('parses vif blocks that contain nested blocks', () => {
    const result = ubiquitiParser.parse(config);
    expect(result.success).toBe(true);
    expect(result.subnets.map((s) => s.vlanId)).toEqual([10, 20]);
    expect(result.subnets[0]!.description).toBe('Users');
  });

  it('handles a long run of unbalanced braces without stalling', () => {
    const hostile = `interfaces {\n vif 10 {${'{'.repeat(20000)}\n address 10.0.0.1/24\n}`;
    const start = Date.now();
    ubiquitiParser.parse(hostile);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('plan schema: prototype key and subnet cap', () => {
  it('drops an own __proto__ key so the parsed plan keeps a plain prototype', () => {
    const file = JSON.parse(
      `{"name":"P","baseIp":"10.0.0.0","createdAt":"${DATE}","updatedAt":"${DATE}","subnets":[],"__proto__":{"polluted":"yes"}}`,
    ) as unknown;
    const plan = parseNetworkPlan(file, 'plan.json');
    expect(Object.getPrototypeOf(plan)).toBe(Object.prototype);
    expect((plan as unknown as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('still preserves other unknown fields', () => {
    const plan = parseNetworkPlan(
      { name: 'P', baseIp: '10.0.0.0', createdAt: DATE, updatedAt: DATE, subnets: [], tags: ['a'] },
      'plan.json',
    );
    expect((plan as unknown as Record<string, unknown>)['tags']).toEqual(['a']);
  });

  it('rejects more subnets than there are VLAN IDs', () => {
    const subnets = Array.from({ length: 4095 }, (_, i) => ({
      id: `s${i}`,
      name: `n${i}`,
      vlanId: 10,
      expectedDevices: 1,
    }));
    expect(() =>
      parseNetworkPlan(
        { name: 'P', baseIp: '10.0.0.0', createdAt: DATE, updatedAt: DATE, subnets },
        'plan.json',
      ),
    ).toThrow(/subnets/);
  });
});

describe('PreferencesService.loadPreferences', () => {
  it('returns defaults without writing to the console when no file exists', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-prefs-'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preferences = await new PreferencesService(home).loadPreferences();
      expect(preferences.growthPercentage).toBe(100);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('postinstall symbolic links', () => {
  const require = createRequire(import.meta.url);
  const postinstall = require('../../scripts/postinstall.cjs') as {
    setupCidrly: () => void;
    getSavedPlansDir: () => string;
  };
  let home: string;

  /** Run the script only when it resolves its target inside the temporary home. */
  const runSetup = (): void => {
    expect(postinstall.getSavedPlansDir().startsWith(home + path.sep)).toBe(true);
    postinstall.setupCidrly();
  };

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-postinstall-'));
    // The script calls os.homedir() at run time; Jest sandboxes process.env, so the
    // home directory is redirected by stubbing the function rather than setting HOME.
    jest.spyOn(os, 'homedir').mockReturnValue(home);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('copies the examples into a fresh home directory', () => {
    runSetup();
    const savedPlans = path.join(home, 'cidrly', 'saved-plans');
    expect(fs.readdirSync(savedPlans).sort()).toEqual([
      'example-branch-office.json',
      'example-campus-network.json',
      'example-data-center.json',
    ]);
  });

  it('does not write through a dangling symbolic link', () => {
    const savedPlans = path.join(home, 'cidrly', 'saved-plans');
    fs.mkdirSync(savedPlans, { recursive: true });
    const target = path.join(home, 'outside-target.json');
    const link = path.join(savedPlans, 'example-campus-network.json');
    fs.symlinkSync(target, link);

    runSetup();

    expect(fs.existsSync(target)).toBe(false);
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(path.join(savedPlans, 'example-data-center.json'))).toBe(true);
  });
});
