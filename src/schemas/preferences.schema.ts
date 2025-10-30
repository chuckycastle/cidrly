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
