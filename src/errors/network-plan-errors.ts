/**
 * Custom Error Classes for cidrly Application
 * Provides structured error handling with error codes and context
 */

/**
 * Error codes for categorizing errors
 */
export enum ErrorCode {
  // Validation Errors (1000-1999)
  INVALID_SUBNET_NAME = 'E1001',
  INVALID_VLAN_ID = 'E1002',
  INVALID_DEVICE_COUNT = 'E1003',
  INVALID_IP_ADDRESS = 'E1004',
  INVALID_PLAN_NAME = 'E1005',
  INVALID_FILENAME = 'E1006',
  INVALID_CIDR = 'E1007',

  // File Operation Errors (2000-2999)
  FILE_NOT_FOUND = 'E2001',
  FILE_READ_ERROR = 'E2002',
  FILE_WRITE_ERROR = 'E2003',
  FILE_PARSE_ERROR = 'E2004',
  INVALID_FILE_FORMAT = 'E2005',
  PATH_TRAVERSAL_DETECTED = 'E2006',

  // Calculation Errors (3000-3999)
  EMPTY_SUBNET_LIST = 'E3001',
  CALCULATION_ERROR = 'E3002',
  NETWORK_ADDRESS_MISSING = 'E3003',
  INVALID_SUBNET_SIZE = 'E3004',

  // User Action Errors (4000-4999)
  USER_CANCELLED = 'E4001',
  NO_PLAN_LOADED = 'E4002',
  NO_SUBNETS_DEFINED = 'E4003',
  PLAN_NOT_CALCULATED = 'E4004',

  // System Errors (5000-5999)
  UNKNOWN_ERROR = 'E5000',
}

/**
 * Base error class for all cidrly errors
 */
export class NetworkPlanError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'NetworkPlanError';
    Object.setPrototypeOf(this, NetworkPlanError.prototype);
  }

  /**
   * Get a user-friendly error message
   */
  public getUserMessage(): string {
    return this.message;
  }

  /**
   * Get error details for logging
   */
  public getDetails(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}

/**
 * Validation error for invalid user input
 */
export class ValidationError extends NetworkPlanError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message, code, context);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * File operation error for I/O failures
 */
export class FileOperationError extends NetworkPlanError {
  constructor(
    message: string,
    code: ErrorCode,
    public readonly filepath?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, code, { ...context, filepath });
    this.name = 'FileOperationError';
    Object.setPrototypeOf(this, FileOperationError.prototype);
  }
}

/**
 * Calculation error for network calculation failures
 */
export class CalculationError extends NetworkPlanError {
  constructor(message: string, code: ErrorCode, context?: Record<string, unknown>) {
    super(message, code, context);
    this.name = 'CalculationError';
    Object.setPrototypeOf(this, CalculationError.prototype);
  }
}

/**
 * User cancellation error (not an actual error, but used for control flow)
 */
export class UserCancellationError extends NetworkPlanError {
  constructor(message = 'Operation cancelled by user') {
    super(message, ErrorCode.USER_CANCELLED);
    this.name = 'UserCancellationError';
    Object.setPrototypeOf(this, UserCancellationError.prototype);
  }
}

/**
 * Error factory functions for creating specific errors
 */
export const ErrorFactory = {
  // Validation errors
  invalidSubnetName: (name: string): ValidationError =>
    new ValidationError(`Invalid subnet name: ${name}`, ErrorCode.INVALID_SUBNET_NAME, { name }),

  invalidVlanId: (vlanId: number | string): ValidationError =>
    new ValidationError(`Invalid VLAN ID: ${vlanId}`, ErrorCode.INVALID_VLAN_ID, { vlanId }),

  invalidDeviceCount: (count: number | string): ValidationError =>
    new ValidationError(`Invalid device count: ${count}`, ErrorCode.INVALID_DEVICE_COUNT, {
      count,
    }),

  invalidIpAddress: (ip: string): ValidationError =>
    new ValidationError(`Invalid IP address: ${ip}`, ErrorCode.INVALID_IP_ADDRESS, { ip }),

  invalidPlanName: (name: string): ValidationError =>
    new ValidationError(`Invalid plan name: ${name}`, ErrorCode.INVALID_PLAN_NAME, { name }),

  invalidFilename: (filename: string, reason: string): ValidationError =>
    new ValidationError(`Invalid filename: ${filename} - ${reason}`, ErrorCode.INVALID_FILENAME, {
      filename,
      reason,
    }),

  // File operation errors
  fileNotFound: (filepath: string): FileOperationError =>
    new FileOperationError(`File not found: ${filepath}`, ErrorCode.FILE_NOT_FOUND, filepath),

  fileReadError: (filepath: string, originalError?: Error): FileOperationError =>
    new FileOperationError(
      `Failed to read file: ${filepath}`,
      ErrorCode.FILE_READ_ERROR,
      filepath,
      { originalError: originalError?.message },
    ),

  fileWriteError: (filepath: string, originalError?: Error): FileOperationError =>
    new FileOperationError(
      `Failed to write file: ${filepath}`,
      ErrorCode.FILE_WRITE_ERROR,
      filepath,
      { originalError: originalError?.message },
    ),

  fileParseError: (filepath: string, originalError?: Error): FileOperationError =>
    new FileOperationError(
      `Failed to parse file: ${filepath}`,
      ErrorCode.FILE_PARSE_ERROR,
      filepath,
      { originalError: originalError?.message },
    ),

  invalidFileFormat: (filepath: string, reason: string): FileOperationError =>
    new FileOperationError(
      `Invalid file format: ${filepath} - ${reason}`,
      ErrorCode.INVALID_FILE_FORMAT,
      filepath,
      { reason },
    ),

  pathTraversalDetected: (filepath: string): FileOperationError =>
    new FileOperationError(
      `Path traversal detected: ${filepath}`,
      ErrorCode.PATH_TRAVERSAL_DETECTED,
      filepath,
    ),

  // Calculation errors
  emptySubnetList: (): CalculationError =>
    new CalculationError(
      'Cannot calculate supernet for empty subnet list',
      ErrorCode.EMPTY_SUBNET_LIST,
    ),

  networkAddressMissing: (subnetName: string): CalculationError =>
    new CalculationError(
      `Subnet must have networkAddress calculated: ${subnetName}`,
      ErrorCode.NETWORK_ADDRESS_MISSING,
      { subnetName },
    ),

  // User action errors
  userCancelled: (): UserCancellationError => new UserCancellationError(),

  noPlanLoaded: (): NetworkPlanError =>
    new NetworkPlanError(
      'No plan loaded. Please create or load a plan first.',
      ErrorCode.NO_PLAN_LOADED,
    ),

  noSubnetsDefined: (): NetworkPlanError =>
    new NetworkPlanError(
      'No subnets defined. Please add at least one subnet.',
      ErrorCode.NO_SUBNETS_DEFINED,
    ),

  planNotCalculated: (): NetworkPlanError =>
    new NetworkPlanError('Plan has not been calculated yet.', ErrorCode.PLAN_NOT_CALCULATED),
};

/**
 * Type guard to check if an error is a NetworkPlanError
 */
export function isNetworkPlanError(error: unknown): error is NetworkPlanError {
  return error instanceof NetworkPlanError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a FileOperationError
 */
export function isFileOperationError(error: unknown): error is FileOperationError {
  return error instanceof FileOperationError;
}

/**
 * Type guard to check if an error is a UserCancellationError
 */
export function isUserCancellationError(error: unknown): error is UserCancellationError {
  return error instanceof UserCancellationError;
}
