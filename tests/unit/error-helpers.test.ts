/**
 * Error Helper Utilities Tests
 */

import { getErrorMessage, isErrnoException } from '../../src/utils/error-helpers.js';

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
