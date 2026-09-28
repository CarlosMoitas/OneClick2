/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],

  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  moduleFileExtensions: ['ts', 'js', 'json'],

  clearMocks: true,

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts'
  ],

  coverageDirectory: 'coverage'
};