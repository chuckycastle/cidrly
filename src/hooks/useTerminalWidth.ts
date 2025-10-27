/**
 * useTerminalWidth Hook
 * Provides reactive terminal width that updates on window resize
 */

import { useStdout } from 'ink';
import { useEffect, useState } from 'react';

/**
 * Custom hook that returns the current terminal width and updates
 * automatically when the terminal window is resized.
 *
 * @returns {number} Current terminal width in columns (defaults to 80 for non-TTY)
 */
export const useTerminalWidth = (): number => {
  const { stdout } = useStdout();
  const [width, setWidth] = useState<number>(stdout.columns || 80);

  useEffect(() => {
    const handleResize = (): void => {
      setWidth(stdout.columns || 80);
    };

    // Listen for terminal resize events
    stdout.on('resize', handleResize);

    // Cleanup listener on unmount
    return (): void => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return width;
};
