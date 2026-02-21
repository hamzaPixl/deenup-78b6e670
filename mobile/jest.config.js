module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
  // Mock modules that require native modules or env vars at import time
  moduleNameMapper: {
    // Provide a manual mock for the Supabase client so tests don't fail on missing SUPABASE_URL
    '../../lib/supabase': '<rootDir>/src/__mocks__/supabase.ts',
    '../lib/supabase': '<rootDir>/src/__mocks__/supabase.ts',
  },
};
