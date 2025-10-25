/**
 * useTerminalHeight Hook
 * Provides reactive terminal height that updates on window resize
 */

import { useStdout } from 'ink';
import { useEffect, useState } from 'react';

/**
 * Custom hook that returns the current terminal height and updates
 * automatically when the terminal window is resized.
 *
 * @returns {number} Current terminal height in rows (defaults to 24 for non-TTY)
 */
export const useTerminalHeight = (): number => {
  const { stdout } = useStdout();
  const [height, setHeight] = useState<number>(stdout.rows || 24);

  useEffect(() => {
    const handleResize = () => {
      setHeight(stdout.rows || 24);
    };

    // Listen for terminal resize events
    stdout.on('resize', handleResize);

    // Cleanup listener on unmount
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return height;
};
