/**
 * Error Helper Utilities Tests
 */

import { getErrorMessage, isErrnoException, isError } from '../../src/utils/error-helpers.js';

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('should return string value directly', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should return "Unknown error" for non-Error, non-string values', () => {
    expect(getErrorMessage(null)).toBe('Unknown error');
    expect(getErrorMessage(undefined)).toBe('Unknown error');
    expect(getErrorMessage(42)).toBe('Unknown error');
    expect(getErrorMessage({ foo: 'bar' })).toBe('Unknown error');
    expect(getErrorMessage([])).toBe('Unknown error');
  });

  it('should handle Error subclasses', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const error = new CustomError('Custom error message');
    expect(getErrorMessage(error)).toBe('Custom error message');
  });
});

describe('isErrnoException', () => {
  it('should return true for NodeJS.ErrnoException-like objects', () => {
    const errnoError: NodeJS.ErrnoException = Object.assign(new Error('ENOENT'), {
      code: 'ENOENT',
      errno: -2,
      syscall: 'open',
    });
    expect(isErrnoException(errnoError)).toBe(true);
  });

  it('should return true for objects with code property', () => {
    const mockError = {
      code: 'EEXIST',
      message: 'File exists',
    };
    expect(isErrnoException(mockError)).toBe(true);
  });

  it('should return false for regular Error objects', () => {
    const error = new Error('Regular error');
    expect(isErrnoException(error)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isErrnoException(null)).toBe(false);
    expect(isErrnoException(undefined)).toBe(false);
    expect(isErrnoException('string')).toBe(false);
    expect(isErrnoException(42)).toBe(false);
  });

  it('should return false for objects without code property', () => {
    expect(isErrnoException({})).toBe(false);
    expect(isErrnoException({ message: 'Error' })).toBe(false);
  });

  it('should return false for objects with non-string code property', () => {
    expect(isErrnoException({ code: 123 })).toBe(false);
    expect(isErrnoException({ code: null })).toBe(false);
    expect(isErrnoException({ code: undefined })).toBe(false);
  });
});

describe('isError', () => {
  it('should return true for Error instances', () => {
    const error = new Error('Test error');
    expect(isError(error)).toBe(true);
  });

  it('should return true for Error subclasses', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const error = new CustomError('Custom error');
    expect(isError(error)).toBe(true);
  });

  it('should return true for built-in error types', () => {
    expect(isError(new TypeError('Type error'))).toBe(true);
    expect(isError(new RangeError('Range error'))).toBe(true);
    expect(isError(new SyntaxError('Syntax error'))).toBe(true);
    expect(isError(new ReferenceError('Reference error'))).toBe(true);
  });

  it('should return false for non-Error values', () => {
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
    expect(isError('string error')).toBe(false);
    expect(isError(42)).toBe(false);
    expect(isError({ message: 'error' })).toBe(false);
    expect(isError([])).toBe(false);
  });

  it('should narrow type correctly in conditional', () => {
    const value: unknown = new Error('Test');
    if (isError(value)) {
      // TypeScript should recognize value as Error
      expect(value.message).toBe('Test');
      expect(value.stack).toBeDefined();
    }
  });
});
