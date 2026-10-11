const path = require('node:path');

const REACT = path.dirname(require.resolve('react/package.json'));

/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  // `example/` is the Expo gallery app: its screen is rendered here, with this package's React Native.
  roots: ['<rootDir>/src', '<rootDir>/example'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  modulePathIgnorePatterns: ['<rootDir>/example/node_modules/'],
  // A generated product system (the acme test fixture) imports the package by name: that is the sources here.
  // `react`: once `example/node_modules` is installed (to run the gallery), Node resolution would hand the gallery
  // screen the app's own React — a second copy next to the renderer's ("Invalid hook call"). Everything rendered by
  // this Jest run uses this package's copy. (`react-native` is already pinned to one copy by the preset's mapper.)
  moduleNameMapper: {
    '^@tanrei/react-native$': '<rootDir>/src/index.ts',
    '^@tanrei/react-native/systems/(.*)$': '<rootDir>/src/generated/systems/$1.ts',
    '^react$': REACT,
    '^react/(.*)$': `${REACT}/$1`,
  },
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
  // pnpm keeps packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?)/)',
  ],
};
