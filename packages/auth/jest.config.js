module.exports = {
  globals: {
    __DEV__: true
  },
  setupTestFrameworkScriptFile: '<rootDir>/test/jest/jest.setup.js',
  noStackTrace: true,
  bail: true,
  cache: false,
  verbose: true,
  testURL: 'http://localhost:8080/',
  collectCoverage: false,
  coverageDirectory: '<rootDir>/test/jest/coverage',
  collectCoverageFrom: [
    '<rootDir>/src/*.js',
    '<rootDir>/src/*.vue'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: [
    '<rootDir>/test/jest/__tests__/**/*.spec.js',
    '<rootDir>/test/jest/__tests__/**/*.test.js',
    '<rootDir>/src/**/__tests__/*jest.spec.js'
  ],
  moduleFileExtensions: [
    'js',
    'vue',
    'json'
  ],
  moduleNameMapper: {
    '^vue$': '<rootDir>/node_modules/vue/dist/vue.common.js',
    '^quasar$': '<rootDir>/node_modules/quasar-framework/dist/umd/quasar.mat.umd.min.js',
    '^~/(.*)$': '<rootDir>/$1',
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '.*\\.vue$': '<rootDir>/../testing/node_modules/vue-jest',
    '.*\\.js$': '<rootDir>/../testing/node_modules/babel-jest'
  },
  snapshotSerializers: [
    // '<rootDir>/../testing/node_modules/jest-serializer-vue'
  ]
}
