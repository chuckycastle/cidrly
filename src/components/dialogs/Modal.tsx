/**
 * Modal Component
 * Overlay wrapper that creates a true pop-up modal experience with backdrop
 */

import { Box } from 'ink';
import React from 'react';

export interface ModalProps {
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ children }) => {
  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      {children}
    </Box>
  );
};
