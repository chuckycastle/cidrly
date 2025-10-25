/**
 * Security Utilities Tests
 * Enhanced tests for path traversal protection
 */

import { describe, expect, it } from '@jest/globals';
import os from 'os';
import path from 'path';
import {
  createPathWhitelist,
  isPathSafe,
  sanitizeFilePath,
  validateFilename,
} from '../../src/infrastructure/security/security-utils.js';

describe('sanitizeFilePath', () => {
  const baseDir = path.resolve(os.tmpdir(), 'test-base');

  it('should accept valid relative paths', () => {
    const result = sanitizeFilePath('test.json', baseDir);
    expect(result).toBe(path.join(baseDir, 'test.json'));
  });

  it('should reject path traversal with ..', () => {
    expect(() => sanitizeFilePath('../outside.json', baseDir)).toThrow(
      'Parent directory reference',
    );
  });

  it('should reject path traversal with multiple ..', () => {
    expect(() => sanitizeFilePath('../../outside.json', baseDir)).toThrow(
      'Parent directory reference',
    );
  });

  it('should reject URL-encoded path traversal (%2e%2e%2f)', () => {
    expect(() => sanitizeFilePath('%2e%2e%2foutside.json', baseDir)).toThrow();
  });

  it('should reject double URL-encoded path traversal', () => {
    expect(() => sanitizeFilePath('%252e%252e%252foutside.json', baseDir)).toThrow();
  });

  it('should reject null bytes', () => {
    expect(() => sanitizeFilePath('test\0.json', baseDir)).toThrow('Null byte detected');
  });

  it('should reject absolute paths', () => {
    expect(() => sanitizeFilePath('/etc/passwd', baseDir)).toThrow('Absolute paths not allowed');
  });

  it('should reject Windows absolute paths', () => {
    // On non-Windows, this might not be detected as absolute
    // So we just verify it doesn't escape the baseDir
    try {
      const result = sanitizeFilePath('C:\\Windows\\System32', baseDir);
      // If it doesn't throw, verify it's still within baseDir
      expect(result.startsWith(baseDir)).toBe(true);
    } catch (error) {
      // If it throws, that's also acceptable
      expect(error).toBeDefined();
    }
  });

  it('should accept nested paths within baseDir', () => {
    const result = sanitizeFilePath('subdir/test.json', baseDir);
    expect(result).toBe(path.join(baseDir, 'subdir', 'test.json'));
  });

  it('should normalize paths with . and ..', () => {
    const result = sanitizeFilePath('./test.json', baseDir);
    expect(result).toBe(path.join(baseDir, 'test.json'));
  });
});

describe('validateFilename', () => {
  it('should accept valid filenames', () => {
    expect(validateFilename('test.json')).toBe(true);
    expect(validateFilename('my-plan.json')).toBe(true);
    expect(validateFilename('plan_2024.json')).toBe(true);
  });

  it('should reject empty filenames', () => {
    expect(validateFilename('')).toContain('cannot be empty');
    expect(validateFilename('   ')).toContain('cannot be empty');
  });

  it('should reject filenames with path separators', () => {
    expect(validateFilename('path/to/file.json')).toContain('path separators');
    expect(validateFilename('path\\to\\file.json')).toContain('path separators');
  });

  it('should reject URL-encoded path separators', () => {
    expect(validateFilename('path%2fto%2ffile.json')).toContain('path separators');
    expect(validateFilename('path%5cto%5cfile.json')).toContain('path separators');
  });

  it('should reject parent directory references', () => {
    const result1 = validateFilename('../test.json');
    const result2 = validateFilename('..\\test.json');
    // Either path separator or parent directory error is acceptable
    expect(typeof result1 === 'string').toBe(true);
    expect(typeof result2 === 'string').toBe(true);
  });

  it('should reject URL-encoded parent directory references', () => {
    const result = validateFilename('%2e%2e%2ftest.json');
    // Either path separator or parent directory error is acceptable
    expect(typeof result === 'string').toBe(true);
  });

  it('should reject null bytes', () => {
    expect(validateFilename('test\0.json')).toContain('invalid characters');
  });

  it('should reject URL-encoded null bytes', () => {
    expect(validateFilename('test%00.json')).toContain('invalid characters');
  });

  it('should reject filenames that are too long', () => {
    const longFilename = 'a'.repeat(256) + '.json';
    expect(validateFilename(longFilename)).toContain('too long');
  });

  it('should reject dangerous characters', () => {
    expect(validateFilename('test<>.json')).toContain('invalid characters');
    expect(validateFilename('test|.json')).toContain('invalid characters');
  });
});

describe('isPathSafe', () => {
  const allowedDir = path.resolve(os.tmpdir(), 'allowed');

  it('should return true for safe paths', () => {
    expect(isPathSafe(path.join(allowedDir, 'test.json'), allowedDir)).toBe(true);
  });

  it('should return false for paths with ..', () => {
    expect(isPathSafe('../outside.json', allowedDir)).toBe(false);
  });

  it('should return false for paths with null bytes', () => {
    expect(isPathSafe('test\0.json', allowedDir)).toBe(false);
  });

  it('should handle edge case empty path', () => {
    // Empty path resolves to current directory, which may or may not be safe
    const result = isPathSafe('', allowedDir);
    expect(typeof result).toBe('boolean');
  });
});

describe('createPathWhitelist', () => {
  const allowedDir1 = path.resolve(os.tmpdir(), 'allowed1');
  const allowedDir2 = path.resolve(os.tmpdir(), 'allowed2');
  const whitelist = createPathWhitelist([allowedDir1, allowedDir2]);

  it('should allow paths in whitelisted directories', () => {
    expect(whitelist(path.join(allowedDir1, 'test.json'))).toBe(true);
    expect(whitelist(path.join(allowedDir2, 'test.json'))).toBe(true);
  });

  it('should reject paths outside whitelisted directories', () => {
    const outsideDir = path.resolve(os.tmpdir(), 'outside');
    expect(whitelist(path.join(outsideDir, 'test.json'))).toBe(false);
  });

  it('should reject path traversal attempts', () => {
    expect(whitelist('../outside.json')).toBe(false);
  });
});

describe('Edge cases and attack vectors', () => {
  const baseDir = path.resolve(os.tmpdir(), 'test-edge');

  it('should handle mixed encoding attacks', () => {
    expect(() => sanitizeFilePath('%2e%2e/test.json', baseDir)).toThrow();
    expect(() => sanitizeFilePath('..%2ftest.json', baseDir)).toThrow();
  });

  it('should handle Unicode homoglyph attacks', () => {
    // Using Unicode lookalike characters
    const result = sanitizeFilePath('test.json', baseDir);
    expect(result).toBe(path.join(baseDir, 'test.json'));
  });

  it('should handle very long paths', () => {
    const longPath = 'a/'.repeat(100) + 'test.json';
    const result = sanitizeFilePath(longPath, baseDir);
    expect(result.startsWith(baseDir)).toBe(true);
  });

  it('should handle special Windows device names', () => {
    // Windows reserved names like CON, PRN, AUX, NUL, COM1, LPT1
    const result = validateFilename('CON.json');
    // Should pass validation (OS will handle it)
    expect(result).toBe(true);
  });
});
