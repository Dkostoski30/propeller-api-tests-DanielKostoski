import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 15000,
  globalSetup: '<rootDir>/helpers/global-setup.ts',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '../reports',
        outputName: 'junit-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '../reports',
        filename: 'test-report.html',
        pageTitle: 'Propeller API E2E Test Report',
        expand: true,
      },
    ],
  ],
};

export default config;
