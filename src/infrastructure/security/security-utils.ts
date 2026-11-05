/**
 * Security Utilities
 * Path and filename validation for user-supplied paths, and control-character
 * handling for text that comes from plan and import files.
 */

import os from 'os';
import path from 'path';
import { FILENAME_RULES } from '../config/validation-rules.js';

/**
 * Decode URL-encoded characters (twice, to catch double encoding).
 * Used for detection only: a path is rejected when its decoded form contains a
 * dangerous pattern, but the path is always resolved exactly as typed.
 * @param input - String that may contain URL-encoded characters
 * @returns Decoded string, or the input when it is not valid percent-encoding
 */
function decodePathSafe(input: string): string {
  try {
    return decodeURIComponent(decodeURIComponent(input));
  } catch {
    return input;
  }
}

/**
 * Check whether a path has a parent-directory segment (`..`).
 * Compares whole segments, so names such as `plan..json` are allowed.
 */
function hasParentSegment(value: string): boolean {
  return value.split(/[\\/]/).some((segment) => segment === '..');
}

/**
 * Resolves a user-provided path (filename, relative path, home path, or absolute path)
 * Supports: filename.json, ./path/file.json, ~/path/file.json, /absolute/path/file.json
 *
 * The path is resolved as typed. Percent-encoded forms are decoded only to
 * reject encoded NUL bytes and parent-directory segments.
 *
 * @param userPath - User-provided path
 * @param baseDir - Default base directory if only filename provided
 * @returns Resolved absolute path
 * @throws Error if path contains a NUL byte or a parent-directory segment
 */
export function resolveUserPath(userPath: string, baseDir: string): string {
  const decodedPath = decodePathSafe(userPath);

  if (userPath.includes('\0') || decodedPath.includes('\0')) {
    throw new Error('Invalid file path: Null byte detected');
  }

  if (hasParentSegment(userPath) || hasParentSegment(decodedPath)) {
    throw new Error('Invalid file path: Parent directory reference (..) not allowed');
  }

  if (path.isAbsolute(userPath)) {
    // Absolute path: /path/to/file.json
    return path.resolve(userPath);
  }

  if (userPath === '~' || userPath.startsWith('~/')) {
    // Home directory path: ~/path/to/file.json
    const homeDir = os.homedir();
    if (!homeDir) {
      throw new Error('Cannot resolve home directory');
    }
    return path.resolve(homeDir, userPath.slice(2));
  }

  if (userPath.includes('/') || userPath.includes(path.sep)) {
    // Relative path with directories: ./path/to/file.json or path/to/file.json
    return path.resolve(process.cwd(), userPath);
  }

  // Just a filename: file.json -> use baseDir
  return path.resolve(baseDir, userPath);
}

/**
 * Terminal control characters: C0 controls except TAB, DEL, and the C1 range.
 * Text from plan or import files that contains these can drive the terminal
 * emulator (OSC title/clipboard writes, CSI cursor and erase sequences, bare CR
 * row overwrites) when rendered through Ink, and can start new lines in
 * generated configuration files.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/g;

/**
 * Remove terminal control characters from text before rendering or emitting it
 * @param value - Text sourced from a file or import
 * @returns The text with control characters removed
 */
export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '');
}

/**
 * Check that text contains no terminal control characters (Zod refinement helper)
 * @param value - Text to check
 * @returns true when the text has no control characters
 */
export function hasNoControlChars(value: string): boolean {
  return !new RegExp(CONTROL_CHARS.source).test(value);
}

/**
 * Validates that a filename is safe and doesn't contain dangerous characters
 * Checks both the typed and the URL-decoded form
 * @param filename - The filename to validate
 * @returns true if valid, error message otherwise
 */
export function validateFilename(filename: string): string | true {
  if (!filename || filename.trim().length === 0) {
    return 'Filename cannot be empty';
  }

  // Decode URL encoding to catch bypass attempts
  const decoded = decodePathSafe(filename);

  // Check for path separators (/, \) in both original and decoded
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    decoded.includes('/') ||
    decoded.includes('\\')
  ) {
    return 'Filename cannot contain path separators';
  }

  // A filename is one segment, so only the exact names `.` and `..` refer to a directory
  if (['.', '..'].includes(filename.trim()) || ['.', '..'].includes(decoded.trim())) {
    return 'Filename cannot contain parent directory references';
  }

  // Check for null bytes
  if (filename.includes('\0') || decoded.includes('\0')) {
    return 'Filename contains invalid characters';
  }

  // Check for dangerous characters
  if (
    FILENAME_RULES.FORBIDDEN_CHARS.test(filename) ||
    FILENAME_RULES.FORBIDDEN_CHARS.test(decoded)
  ) {
    return 'Filename contains invalid characters';
  }

  // Check filename length (common filesystem limit is 255)
  if (filename.length > FILENAME_RULES.MAX_LENGTH) {
    return `Filename is too long (max ${FILENAME_RULES.MAX_LENGTH} characters)`;
  }

  return true;
}
