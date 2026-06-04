module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/algorithms/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 65,
      lines: 70,
    },
  },
};
