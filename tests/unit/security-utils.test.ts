/**
 * Security Utilities Tests
 * Path resolution, filename validation and control-character handling
 */

import { describe, expect, it } from '@jest/globals';
import os from 'os';
import path from 'path';
import {
  hasNoControlChars,
  resolveUserPath,
  stripControlChars,
  validateFilename,
} from '../../src/infrastructure/security/security-utils.js';

describe('resolveUserPath', () => {
  const baseDir = path.join(os.tmpdir(), 'cidrly-test-base');

  it('should resolve a bare filename against the base directory', () => {
    expect(resolveUserPath('test.json', baseDir)).toBe(path.join(baseDir, 'test.json'));
  });

  it('should resolve a relative path with directories against the working directory', () => {
    expect(resolveUserPath('sub/test.json', baseDir)).toBe(
      path.resolve(process.cwd(), 'sub/test.json'),
    );
    expect(resolveUserPath('./test.json', baseDir)).toBe(path.resolve(process.cwd(), 'test.json'));
  });

  it('should keep absolute paths', () => {
    const absolute = path.join(os.tmpdir(), 'elsewhere', 'plan.cidr');
    expect(resolveUserPath(absolute, baseDir)).toBe(absolute);
  });

  it('should expand ~ and ~/ to the home directory', () => {
    expect(resolveUserPath('~', baseDir)).toBe(os.homedir());
    expect(resolveUserPath('~/plans/x.cidr', baseDir)).toBe(
      path.join(os.homedir(), 'plans', 'x.cidr'),
    );
  });

  it('should treat a name that merely starts with ~ as a filename', () => {
    expect(resolveUserPath('~backup.json', baseDir)).toBe(path.join(baseDir, '~backup.json'));
  });

  it('should reject parent directory segments', () => {
    expect(() => resolveUserPath('../outside.json', baseDir)).toThrow('Parent directory');
    expect(() => resolveUserPath('a/../../outside.json', baseDir)).toThrow('Parent directory');
    expect(() => resolveUserPath('~/../outside.json', baseDir)).toThrow('Parent directory');
    expect(() => resolveUserPath('..\\outside.json', baseDir)).toThrow('Parent directory');
  });

  it('should reject URL-encoded and double-encoded parent directory segments', () => {
    expect(() => resolveUserPath('%2e%2e%2foutside.json', baseDir)).toThrow('Parent directory');
    expect(() => resolveUserPath('%252e%252e%252foutside.json', baseDir)).toThrow(
      'Parent directory',
    );
    expect(() => resolveUserPath('..%2fx.json', baseDir)).toThrow('Parent directory');
  });

  it('should reject null bytes, raw and encoded', () => {
    expect(() => resolveUserPath('test\0.json', baseDir)).toThrow('Null byte');
    expect(() => resolveUserPath('test%00.json', baseDir)).toThrow('Null byte');
  });

  it('should allow names that contain two dots without being a parent segment', () => {
    expect(resolveUserPath('plan..json', baseDir)).toBe(path.join(baseDir, 'plan..json'));
    expect(resolveUserPath('v1..2.cidr', baseDir)).toBe(path.join(baseDir, 'v1..2.cidr'));
  });

  it('should resolve percent sequences as typed, not decoded', () => {
    expect(resolveUserPath('%41.json', baseDir)).toBe(path.join(baseDir, '%41.json'));
    expect(resolveUserPath('%2Fetc%2Fhosts.json', baseDir)).toBe(
      path.join(baseDir, '%2Fetc%2Fhosts.json'),
    );
    expect(resolveUserPath('100%.json', baseDir)).toBe(path.join(baseDir, '100%.json'));
  });
});

describe('validateFilename', () => {
  it('should accept valid filenames', () => {
    expect(validateFilename('test.json')).toBe(true);
    expect(validateFilename('my-plan.json')).toBe(true);
    expect(validateFilename('plan_2024.json')).toBe(true);
    expect(validateFilename('plan..json')).toBe(true);
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
    expect(typeof validateFilename('../test.json')).toBe('string');
    expect(typeof validateFilename('..\\test.json')).toBe('string');
    expect(validateFilename('..')).toContain('parent directory');
    expect(validateFilename('.')).toContain('parent directory');
    expect(validateFilename('%2e%2e')).toContain('parent directory');
  });

  it('should reject URL-encoded parent directory references', () => {
    expect(typeof validateFilename('%2e%2e%2ftest.json')).toBe('string');
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

describe('control character helpers', () => {
  it('should strip C0, DEL and C1 characters but keep tab', () => {
    expect(stripControlChars('a\u001b[2Jb\u0007c\u007fd\u009be\tf')).toBe('a[2Jbcde\tf');
    expect(stripControlChars('line1\r\nline2')).toBe('line1line2');
  });

  it('should leave plain and unicode text unchanged', () => {
    expect(stripControlChars('Büro Etage 2')).toBe('Büro Etage 2');
  });

  it('should report whether text contains control characters', () => {
    expect(hasNoControlChars('plain text')).toBe(true);
    expect(hasNoControlChars('tab\tok')).toBe(true);
    expect(hasNoControlChars('with\nnewline')).toBe(false);
    expect(hasNoControlChars('esc\u001b')).toBe(false);
  });
});
