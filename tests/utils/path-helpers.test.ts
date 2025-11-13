/**
 * Path Helpers Tests
 * Unit tests for path utility functions
 */

import { describe, expect, it } from '@jest/globals';
import {
  isShellEscaped,
  normalizePathForFs,
  unescapeShellPath,
} from '../../src/utils/path-helpers';

describe('unescapeShellPath', () => {
  describe('Unix paths', () => {
    it('unescapes single space', () => {
      expect(unescapeShellPath('/path/folder\\ with\\ space')).toBe('/path/folder with space');
    });

    it('unescapes multiple consecutive spaces', () => {
      // Note: Each '\ ' is replaced with ' ', so '\\ \\ ' becomes '  ' (two spaces)
      expect(unescapeShellPath('/path/folder\\ \\ with\\ \\ spaces')).toBe(
        '/path/folder  with  spaces',
      );
    });

    it('handles mixed escaped and unescaped spaces', () => {
      expect(unescapeShellPath('/path/folder\\ mixed with\\ spaces')).toBe(
        '/path/folder mixed with spaces',
      );
    });

    it('leaves paths without escapes unchanged', () => {
      expect(unescapeShellPath('/path/no-escapes/here')).toBe('/path/no-escapes/here');
    });

    it('handles paths with spaces but no escapes', () => {
      expect(unescapeShellPath('/path/folder with space')).toBe('/path/folder with space');
    });

    it('handles empty string', () => {
      expect(unescapeShellPath('')).toBe('');
    });

    it('handles relative paths', () => {
      expect(unescapeShellPath('./folder\\ with\\ space/file.txt')).toBe(
        './folder with space/file.txt',
      );
    });

    it('handles home directory expansion marker', () => {
      expect(unescapeShellPath('~/folder\\ with\\ space')).toBe('~/folder with space');
    });
  });

  describe('Windows paths', () => {
    it('preserves Windows drive letter backslash', () => {
      expect(unescapeShellPath('C:\\Program\\ Files\\app')).toBe('C:\\Program Files\\app');
    });

    it('handles Windows path with multiple escaped spaces', () => {
      expect(unescapeShellPath('D:\\My\\ Documents\\folder\\ name\\file.txt')).toBe(
        'D:\\My Documents\\folder name\\file.txt',
      );
    });

    it('handles Windows path without escapes', () => {
      expect(unescapeShellPath('C:\\Users\\Documents')).toBe('C:\\Users\\Documents');
    });

    it('handles Windows UNC paths', () => {
      // UNC paths start with \\ and should preserve backslashes
      expect(unescapeShellPath('\\\\server\\share\\ name')).toBe('\\\\server\\share name');
    });
  });

  describe('Edge cases', () => {
    it('handles path ending with escaped space', () => {
      // Trimming removes trailing space from path component
      expect(unescapeShellPath('/path/folder\\ ')).toBe('/path/folder');
    });

    it('handles path starting with escaped space', () => {
      // Trimming removes leading space from path component
      expect(unescapeShellPath('/\\ path/folder')).toBe('/path/folder');
    });

    it('handles only escaped spaces', () => {
      // Trimming removes all spaces from empty components
      expect(unescapeShellPath('\\ \\ \\ ')).toBe('');
    });

    it('handles backslashes not followed by spaces (Unix)', () => {
      expect(unescapeShellPath('/path/file\\nname')).toBe('/path/file\\nname');
    });

    it('handles filename with escaped spaces', () => {
      expect(unescapeShellPath('file\\ name\\ here.txt')).toBe('file name here.txt');
    });

    it('trims whitespace from path components (extra space before slash)', () => {
      expect(unescapeShellPath('/path/folder\\ with\\ space /file.txt')).toBe(
        '/path/folder with space/file.txt',
      );
    });

    it('trims trailing spaces from directory names', () => {
      expect(unescapeShellPath('/Users/test/folder\\ with\\ space ')).toBe(
        '/Users/test/folder with space',
      );
    });

    it('handles multiple spaces between path components', () => {
      expect(unescapeShellPath('/path/folder  /file.txt')).toBe('/path/folder/file.txt');
    });
  });
});

describe('isShellEscaped', () => {
  it('detects escaped spaces', () => {
    expect(isShellEscaped('/path/folder\\ with\\ space')).toBe(true);
  });

  it('returns false for paths without escapes', () => {
    expect(isShellEscaped('/path/folder with space')).toBe(false);
  });

  it('returns false for Windows paths', () => {
    expect(isShellEscaped('C:\\Program Files\\app')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isShellEscaped('')).toBe(false);
  });

  it('returns true for path with single escaped space', () => {
    expect(isShellEscaped('folder\\ name')).toBe(true);
  });

  it('returns false for backslashes not followed by spaces', () => {
    expect(isShellEscaped('/path/file\\nname')).toBe(false);
  });
});

describe('normalizePathForFs', () => {
  it('unescapes and normalizes path with . and ..', () => {
    expect(normalizePathForFs('/path/folder\\ with\\ space/./file.txt')).toBe(
      '/path/folder with space/file.txt',
    );
  });

  it('handles complex normalization', () => {
    expect(normalizePathForFs('/path/folder\\ name/../other/./file.txt')).toBe(
      '/path/other/file.txt',
    );
  });

  it('handles Windows paths', () => {
    // path.normalize on Unix doesn't fully normalize Windows paths with '..'
    // This test verifies the path is at least unescaped correctly
    const result = normalizePathForFs('C:\\Users\\..\\Program\\ Files\\app');
    expect(result).toContain('Program Files');
    expect(result).toContain('app');
  });

  it('handles empty string', () => {
    expect(normalizePathForFs('')).toBe('');
  });

  it('handles paths without escapes or normalization needed', () => {
    expect(normalizePathForFs('/path/to/file.txt')).toBe('/path/to/file.txt');
  });
});

describe('Real-world scenarios', () => {
  it('handles macOS Finder drag-and-drop path', () => {
    const macOsPath = '/Users/username/Desktop/test/folder\\ with\\ space';
    expect(unescapeShellPath(macOsPath)).toBe('/Users/username/Desktop/test/folder with space');
  });

  it('handles bash/zsh copy-pasted path', () => {
    const bashPath = '~/Documents/My\\ Projects/cidrly\\ app/';
    expect(unescapeShellPath(bashPath)).toBe('~/Documents/My Projects/cidrly app/');
  });

  it('handles path with special characters and spaces', () => {
    const complexPath = '/path/folder\\ (with\\ parens)/file\\ [brackets].txt';
    expect(unescapeShellPath(complexPath)).toBe('/path/folder (with parens)/file [brackets].txt');
  });

  it('handles Windows copy-pasted path', () => {
    const windowsPath = 'C:\\Program\\ Files\\My\\ App\\config.json';
    expect(unescapeShellPath(windowsPath)).toBe('C:\\Program Files\\My App\\config.json');
  });
});
