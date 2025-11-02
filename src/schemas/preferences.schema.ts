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
    .default('10.0.0.0'),

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
  baseIp: '10.0.0.0',
  savedPlansDir: undefined,
  exportsDir: undefined,
  version: 1,
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
