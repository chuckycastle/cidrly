/**
 * Zod Schemas for Runtime Type Validation
 * Provides type-safe parsing and validation for network plans
 */

import { z } from 'zod';
import { ErrorFactory } from '../errors/index.js';
import {
  CIDR_RULES,
  DEVICE_COUNT_RULES,
  PLAN_NAME_RULES,
  SUBNET_NAME_RULES,
  VLAN_RULES,
} from '../infrastructure/config/validation-rules.js';

/**
 * SubnetInfo schema - validates subnet calculation results
 */
const SubnetInfoSchema = z.object({
  expectedDevices: z.number().int().min(DEVICE_COUNT_RULES.MIN).max(DEVICE_COUNT_RULES.MAX),
  plannedDevices: z
    .number()
    .int()
    .min(DEVICE_COUNT_RULES.MIN)
    .max(DEVICE_COUNT_RULES.MAX * 2),
  requiredHosts: z.number().int().positive(),
  subnetSize: z.number().int().positive(),
  cidrPrefix: z.number().int().min(CIDR_RULES.ABSOLUTE_MIN).max(CIDR_RULES.ABSOLUTE_MAX),
  usableHosts: z.number().int().nonnegative(),
  networkAddress: z.string().optional(),
});

/**
 * Subnet schema - validates individual subnet entries
 */
const SubnetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(SUBNET_NAME_RULES.MIN_LENGTH).max(SUBNET_NAME_RULES.MAX_LENGTH),
  vlanId: z.number().int().min(VLAN_RULES.MIN).max(VLAN_RULES.MAX),
  expectedDevices: z.number().int().min(DEVICE_COUNT_RULES.MIN).max(DEVICE_COUNT_RULES.MAX),
  subnetInfo: SubnetInfoSchema.optional(),
});

/**
 * IP address validation using regex
 */
const IpAddressSchema = z
  .string()
  .regex(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, 'Invalid IP address format')
  .refine(
    (ip) => {
      const parts = ip.split('.').map(Number);
      return parts.every((part) => part >= 0 && part <= 255);
    },
    { message: 'IP address octets must be 0-255' },
  );

/**
 * Supernet schema - validates calculated supernet information
 */
const SupernetSchema = z.object({
  cidrPrefix: z.number().int().min(CIDR_RULES.ABSOLUTE_MIN).max(CIDR_RULES.ABSOLUTE_MAX),
  totalSize: z.number().int().positive(),
  usedSize: z.number().int().positive(),
  efficiency: z.number().min(0).max(100),
  rangeEfficiency: z.number().min(0).max(100).default(100), // Default to 100% for old plans
  networkAddress: z.string(),
});

/**
 * NetworkPlan schema - validates complete network plan
 */
const NetworkPlanSchema = z.object({
  name: z.string().min(PLAN_NAME_RULES.MIN_LENGTH).max(PLAN_NAME_RULES.MAX_LENGTH),
  baseIp: IpAddressSchema,
  subnets: z.array(SubnetSchema),
  supernet: SupernetSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Parse and validate a network plan from unknown data
 * @param data - Unknown data to parse (typically from JSON.parse)
 * @param filepath - Optional filepath for error context
 * @returns Validated NetworkPlan
 * @throws FileOperationError if validation fails
 */
export function parseNetworkPlan(data: unknown, filepath?: string): NetworkPlan {
  const result = NetworkPlanSchema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw filepath
      ? ErrorFactory.invalidFileFormat(filepath, `Plan validation failed: ${errorDetails}`)
      : ErrorFactory.fileParseError(
          filepath ?? 'unknown',
          new Error(`Validation failed: ${errorDetails}`),
        );
  }

  return result.data;
}

/**
 * Parse and validate a subnet from unknown data
 * @param data - Unknown data to parse
 * @returns Validated Subnet
 * @throws ValidationError if validation fails
 */
export function parseSubnet(data: unknown): Subnet {
  const result = SubnetSchema.safeParse(data);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Subnet validation failed: ${errorDetails}`);
  }

  return result.data;
}

/**
 * Type exports for use in other modules
 */
export type NetworkPlan = z.infer<typeof NetworkPlanSchema>;
export type Subnet = z.infer<typeof SubnetSchema>;
export type SubnetInfo = z.infer<typeof SubnetInfoSchema>;
