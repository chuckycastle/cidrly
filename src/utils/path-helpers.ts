/**
 * Path Helper Utilities
 * Utilities for handling file paths, including shell escape sequence removal
 */

import path from 'path';

/**
 * Unescape shell-escaped paths (e.g., from copy/paste or drag/drop on macOS)
 *
 * macOS and Unix shells escape spaces with backslashes when copying paths:
 * - Input: `/path/folder\ with\ space`
 * - Output: `/path/folder with space`
 *
 * This function removes escape backslashes before spaces while preserving:
 * - Actual backslashes in Windows paths (C:\Program Files\)
 * - Escaped characters other than spaces
 * - Multiple consecutive escaped spaces
 *
 * Additionally trims whitespace from each path component to handle cases like:
 * - `folder\ with\ space /file.txt` (extra space before slash)
 *
 * @param inputPath - Path that may contain shell escape sequences
 * @returns Unescaped path suitable for Node.js fs operations
 *
 * @example
 * ```typescript
 * unescapeShellPath('/Users/user/folder\\ with\\ space')
 * // Returns: '/Users/user/folder with space'
 *
 * unescapeShellPath('/Users/user/folder\\ with\\ space /file.txt')
 * // Returns: '/Users/user/folder with space/file.txt' (extra space trimmed)
 *
 * unescapeShellPath('C:\\Program\\ Files\\app')
 * // Returns: 'C:\\Program Files\\app' (Windows path preserved)
 *
 * unescapeShellPath('/path/no-spaces')
 * // Returns: '/path/no-spaces' (unchanged)
 * ```
 */
export function unescapeShellPath(inputPath: string): string {
  if (!inputPath) {
    return inputPath;
  }

  let unescaped: string;

  // Check if this looks like a Windows path (starts with drive letter)
  const isWindowsPath = /^[a-zA-Z]:\\/.test(inputPath);

  // For Windows paths, only unescape spaces after the drive letter
  // For Unix paths, unescape spaces anywhere
  if (isWindowsPath) {
    // Split on drive letter, preserve it, then unescape the rest
    const match = inputPath.match(/^([a-zA-Z]:\\)(.*)/);
    if (match?.[1] && match[2]) {
      const driveLetter = match[1];
      const restOfPath = match[2];
      unescaped = driveLetter + restOfPath.replace(/\\\s/g, ' ');
    } else {
      unescaped = inputPath;
    }
  } else {
    // Unix path: Replace backslash-space with just space
    // This handles: '\ ' -> ' '
    unescaped = inputPath.replace(/\\\s/g, ' ');
  }

  // Trim whitespace from each path component to handle cases like:
  // "folder\ with\ space /file.txt" -> "folder with space /file.txt" -> "folder with space/file.txt"
  const separator = isWindowsPath ? '\\' : '/';
  const parts = unescaped.split(separator).map((part) => part.trim());

  // Reconstruct the path
  let result = parts.join(separator);

  // Restore leading separator for absolute Unix paths if it was removed by split
  if (!isWindowsPath && inputPath.startsWith('/') && !result.startsWith('/')) {
    result = '/' + result;
  }

  return result;
}

/**
 * Check if a path appears to be shell-escaped
 * Useful for determining if preprocessing is needed
 *
 * @param inputPath - Path to check
 * @returns true if path contains escape sequences
 *
 * @example
 * ```typescript
 * isShellEscaped('/path/folder\\ with\\ space') // true
 * isShellEscaped('/path/folder with space')    // false
 * isShellEscaped('C:\\Program Files')          // false (Windows path, not escaped)
 * ```
 */
export function isShellEscaped(inputPath: string): boolean {
  if (!inputPath) {
    return false;
  }

  // Check for backslash followed by space
  // This is the primary indicator of shell escaping
  return /\\\s/.test(inputPath);
}

/**
 * Normalize a path for use with Node.js fs operations
 * Combines shell unescape with path normalization and component trimming
 *
 * @param inputPath - Path to normalize
 * @returns Normalized path ready for fs operations
 *
 * @example
 * ```typescript
 * normalizePathForFs('/path/folder\\ with\\ space/./file.txt')
 * // Returns: '/path/folder with space/file.txt'
 *
 * normalizePathForFs('/path/folder\\ with\\ space /file.txt')
 * // Returns: '/path/folder with space/file.txt' (trailing spaces trimmed)
 * ```
 */
export function normalizePathForFs(inputPath: string): string {
  if (!inputPath) {
    return inputPath;
  }

  // First unescape shell sequences
  const unescaped = unescapeShellPath(inputPath);

  // Split path into components, trim each component, then rejoin
  // This handles cases like "folder\ with\ space /file.txt" (extra space before slash)
  const isAbsolute = path.isAbsolute(unescaped);
  const parts = unescaped.split(path.sep).map((part) => part.trim());

  // Reconstruct path
  let normalized = parts.join(path.sep);

  // Restore leading slash for absolute paths if it was removed
  if (isAbsolute && !normalized.startsWith(path.sep)) {
    normalized = path.sep + normalized;
  }

  // Then normalize the path (resolve ., .., etc.)
  return path.normalize(normalized);
}
