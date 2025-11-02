export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler',
        },
      },
    ],
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/commands/**/*.tsx',
    '!src/components/**/*.tsx',
    '!src/dashboard/**/*.ts',
    '!src/cli.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    // Per-file thresholds for critical business logic
    // Note: When per-file thresholds are present, Jest does NOT enforce a separate
    // global threshold. These thresholds enforce high coverage where it matters most.

    // Core domain layer - foundation of business logic (70%+ target)
    'src/core/calculators/subnet-calculator.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/core/validators/validators.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },

    // Service layer - critical business operations (80-95% target)
    'src/services/file.service.ts': {
      branches: 80,
      functions: 100,
      lines: 85,
      statements: 85,
    },
    'src/services/network-plan.service.ts': {
      branches: 80,
      functions: 85,
      lines: 84,
      statements: 85,
    },
    'src/services/preferences.service.ts': {
      branches: 57,
      functions: 85,
      lines: 80,
      statements: 80,
    },

    // Data access layer (75-100% target)
    'src/repositories/file-system.repository.ts': {
      branches: 100,
      functions: 75,
      lines: 80,
      statements: 75,
    },

    // Data schemas - validation logic (100% target)
    'src/schemas/preferences.schema.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },

    // Utilities - pure functions (70-100% target)
    'src/utils/subnet-sorters.ts': {
      branches: 70,
      functions: 100,
      lines: 95,
      statements: 85,
    },

    // Security/Infrastructure - critical for safety (75-100% target)
    // Note: Symlink detection code is platform-dependent and difficult to test comprehensively
    'src/infrastructure/security/security-utils.ts': {
      branches: 76,
      functions: 100,
      lines: 75,
      statements: 75,
    },
  },
};
