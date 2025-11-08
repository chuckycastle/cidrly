/**
 * Debounce Utility
 * Delays function execution until after a specified delay
 */

/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const saveData = debounce((data: string) => {
 *   fs.writeFileSync('file.txt', data);
 * }, 500);
 *
 * saveData('foo'); // Won't execute immediately
 * saveData('bar'); // Cancels previous, won't execute immediately
 * saveData('baz'); // Cancels previous, executes after 500ms
 * ```
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a debounced function with a flush method to immediately invoke pending calls
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns Debounced function with flush method
 *
 * @example
 * ```ts
 * const saveData = debouncedWithFlush((data: string) => {
 *   fs.writeFileSync('file.txt', data);
 * }, 500);
 *
 * saveData('foo');
 * saveData('bar');
 * saveData.flush(); // Immediately saves 'bar'
 * ```
 */
export function debouncedWithFlush<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) & { flush: () => void; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const debounced = function (...args: Parameters<T>): void {
    pendingArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (pendingArgs !== null) {
        func(...pendingArgs);
        pendingArgs = null;
      }
      timeoutId = null;
    }, delay);
  };

  debounced.flush = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (pendingArgs !== null) {
      func(...pendingArgs);
      pendingArgs = null;
    }
  };

  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  return debounced;
}
