/**
 * Preferences Schema
 * Defines user preferences with validation rules
 */

import { z } from 'zod';

/**
 * User preferences schema
 */
export const preferencesSchema = z.object({
  /**
   * Growth percentage for capacity planning
   * - 0%: No growth (exact device count)
   * - 100%: Double capacity (default)
   * - 200%: Triple capacity
   * - 300%: Quadruple capacity
   */
  growthPercentage: z
    .number()
    .min(0, 'Growth percentage must be at least 0%')
    .max(300, 'Growth percentage cannot exceed 300%')
    .int('Growth percentage must be a whole number')
    .default(100),

  /**
   * Default base IP address for new plans
   */
  baseIp: z
    .string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Must be a valid IP address')
    .default('192.0.2.0'),

  /**
   * Custom directory for saved plans (optional override)
   * Defaults to ~/cidrly/saved-plans if not set
   */
  savedPlansDir: z.string().optional(),

  /**
   * Custom directory for exported files (optional override)
   * Defaults to ~/cidrly/exports if not set
   */
  exportsDir: z.string().optional(),

  /**
   * Schema version for future migrations
   */
  version: z.number().default(1),

  /**
   * Auto-save enabled
   * When true, automatically saves plan after changes
   */
  autoSave: z.boolean().default(false),

  /**
   * Save debounce delay in milliseconds
   * Prevents excessive disk writes by delaying saves
   * Only applies when autoSave is enabled
   */
  saveDelay: z.number().min(100).max(5000).int().default(500),

  /**
   * Column display preferences for subnet table
   */
  columnPreferences: z
    .object({
      visibleColumns: z
        .array(z.enum(['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description']))
        .default(['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description']),
      columnOrder: z
        .array(z.string())
        .default(['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description']),
    })
    .default({
      visibleColumns: ['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description'],
      columnOrder: ['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description'],
    }),
});

/**
 * Type inference from schema
 */
export type Preferences = z.infer<typeof preferencesSchema>;

/**
 * Default preferences
 */
export const defaultPreferences: Preferences = {
  growthPercentage: 100,
  baseIp: '192.0.2.0',
  savedPlansDir: undefined,
  exportsDir: undefined,
  version: 1,
  autoSave: false,
  saveDelay: 500,
  columnPreferences: {
    visibleColumns: ['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description'],
    columnOrder: ['name', 'vlan', 'expected', 'planned', 'usable', 'network', 'description'],
  },
};

/**
 * Validate preferences data
 */
export function validatePreferences(data: unknown): Preferences {
  return preferencesSchema.parse(data);
}

/**
 * Safely parse preferences with fallback to defaults
 */
export function safeParsePreferences(data: unknown): Preferences {
  const result = preferencesSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return defaultPreferences;
}
