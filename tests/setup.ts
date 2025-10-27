/**
 * Jest Test Setup
 * Configuration that runs before all tests
 */

import '@testing-library/jest-dom';

// Silence console errors in tests (optional - remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: Parameters<typeof console.error>): void => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
