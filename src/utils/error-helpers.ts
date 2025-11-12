/**
 * Error Helper Utilities
 * Functions for standardized error handling and message extraction
 */

/**
 * Safely extracts an error message from an unknown error value
 *
 * @param error - Unknown error value (Error, string, or other)
 * @returns Human-readable error message
 *
 * @example
 * ```typescript
 * try {
 *   // risky operation
 * } catch (error) {
 *   notify.error(`Failed: ${getErrorMessage(error)}`);
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

/**
 * Type guard to check if value is an Error instance
 *
 * @param value - Unknown value to check
 * @returns True if value is an Error instance
 *
 * @example
 * ```typescript
 * try {
 *   // risky operation
 * } catch (error) {
 *   if (isError(error)) {
 *     console.log(error.message); // TypeScript knows error is Error
 *   }
 * }
 * ```
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if error is a NodeJS.ErrnoException
 *
 * @param error - Unknown error value
 * @returns True if error has ErrnoException properties
 */
export function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  );
}
