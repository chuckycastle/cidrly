/**
 * Import Types
 * Types and interfaces for network configuration import
 */

// Import types for network configuration import

/**
 * Supported import format identifiers
 */
export type ImportFormat =
  | 'csv'
  | 'yaml'
  | 'cisco-ios'
  | 'cisco-nxos'
  | 'arista-eos'
  | 'juniper-junos'
  | 'fortinet'
  | 'netgear'
  | 'ubiquiti';

/**
 * Import mode - create new plan or merge with existing
 */
export type ImportMode = 'create' | 'merge';

/**
 * Import options
 */
export interface ImportOptions {
  /** Import mode */
  mode: ImportMode;
  /** Plan name (for create mode) */
  planName?: string;
  /** Base IP (for create mode, or to override detected value) */
  baseIp?: string;
  /** Skip subnets with duplicate VLAN IDs */
  skipDuplicateVlans?: boolean;
  /** Override existing subnets with same VLAN ID (merge mode) */
  overrideExisting?: boolean;
}

/**
 * Imported subnet data (before full Subnet creation)
 */
export interface ImportedSubnet {
  /** Subnet name */
  name: string;
  /** VLAN ID */
  vlanId: number;
  /** Expected device count */
  expectedDevices: number;
  /** Network address with CIDR (e.g., "10.0.0.0/24") */
  networkAddress?: string;
  /** CIDR prefix */
  cidrPrefix?: number;
  /** Description */
  description?: string;
  /** Gateway IP */
  gatewayIp?: string;
}

/**
 * Parse warning - non-fatal issues during parsing
 */
export interface ParseWarning {
  /** Line number (if applicable) */
  line?: number;
  /** Warning message */
  message: string;
  /** Original content that triggered warning */
  content?: string;
}

/**
 * Parse error - fatal issues that prevent parsing
 */
export interface ParseError {
  /** Line number (if applicable) */
  line?: number;
  /** Error message */
  message: string;
  /** Original content that triggered error */
  content?: string;
}

/**
 * Result of parsing a configuration file
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed subnets */
  subnets: ImportedSubnet[];
  /** Detected base IP (if any) */
  detectedBaseIp?: string;
  /** Detected plan name (if any) */
  detectedPlanName?: string;
  /** Non-fatal warnings */
  warnings: ParseWarning[];
  /** Fatal errors */
  errors: ParseError[];
}

/**
 * Result of import operation
 */
export interface ImportResult {
  /** Whether import succeeded */
  success: boolean;
  /** Number of subnets imported */
  importedCount: number;
  /** Number of subnets skipped */
  skippedCount: number;
  /** Warnings during import */
  warnings: string[];
  /** Error message (if failed) */
  error?: string;
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  mode: 'create',
  skipDuplicateVlans: true,
  overrideExisting: false,
};
