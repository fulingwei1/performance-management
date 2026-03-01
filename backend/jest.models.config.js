module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/models/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }],
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  testTimeout: 10000,
  // No setupFilesAfterEnv - these tests mock the DB themselves
};
