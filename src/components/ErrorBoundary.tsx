/**
 * ErrorBoundary Component
 * Catches React errors and displays fallback UI
 */

import { Box, Text } from 'ink';
import React from 'react';
import { colors } from '../themes/colors.js';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    this.setState({
      error,
      errorInfo,
    });

    // In development, log to console
    if (process.env['NODE_ENV'] === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" paddingX={2} paddingY={2}>
          <Box marginBottom={1}>
            <Text bold>{colors.error('Application Error')}</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>
              {colors.muted('cidrly encountered an unexpected error and cannot continue.')}
            </Text>
          </Box>

          {this.state.error && (
            <Box marginBottom={1} flexDirection="column">
              <Text>{colors.warning('Error Details:')}</Text>
              <Box marginLeft={2}>
                <Text>{colors.dim(this.state.error.message)}</Text>
              </Box>
            </Box>
          )}

          <Box marginBottom={1}>
            <Text>{colors.muted('Please report this issue at:')}</Text>
          </Box>

          <Box marginBottom={1} marginLeft={2}>
            <Text>{colors.accent('https://github.com/chuckycastle/cidrly/issues')}</Text>
          </Box>

          {process.env['NODE_ENV'] === 'development' && this.state.errorInfo && (
            <Box marginTop={1} flexDirection="column">
              <Text>{colors.warning('Component Stack (development only):')}</Text>
              <Box marginLeft={2}>
                <Text>{colors.dim(this.state.errorInfo.componentStack)}</Text>
              </Box>
            </Box>
          )}

          <Box marginTop={1}>
            <Text>{colors.dim('Press Ctrl+C to exit')}</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
