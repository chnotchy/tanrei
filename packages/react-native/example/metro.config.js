// The gallery draws the library FROM SOURCE (../src) and reads the fixtures from the repository's specs
// (../../../specs/<name>.spec.json, one import per entry of src/registry.tsx), so Metro watches the repository and resolves the package name to the sources.
// The library's own `react` / `react-native` imports must resolve to THIS app's copies (one React, one renderer):
// the package directory has its own, newer ones for its tests.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const library = path.resolve(__dirname, '..');
const repository = path.resolve(library, '../..');
const app = path.join(__dirname, 'index.js');
const SINGLETONS = /^(react|react-native)(\/.*)?$/;

const config = getDefaultConfig(__dirname);
config.watchFolders = [repository];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@tanrei/react-native') return { type: 'sourceFile', filePath: path.join(library, 'src/index.ts') };
  const system = /^@tanrei\/react-native\/systems\/(.+)$/.exec(moduleName);
  if (system) return { type: 'sourceFile', filePath: path.join(library, 'src/generated/systems', `${system[1]}.ts`) };
  if (SINGLETONS.test(moduleName) && !context.originModulePath.startsWith(__dirname)) return context.resolveRequest({ ...context, originModulePath: app }, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
