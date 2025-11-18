const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Directorio del proyecto (example)
const projectRoot = __dirname;

// Directorio del módulo (un nivel arriba)
const moduleRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Permitir que Metro monitoree archivos en el directorio padre
config.watchFolders = [moduleRoot];

// 2. Configurar dónde Metro debe buscar node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(moduleRoot, 'node_modules'),
];

// 3. Bloquear node_modules del módulo para evitar duplicados
// (especialmente importante para react, react-native, expo)
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  // Ignorar node_modules del directorio padre
  new RegExp(`${escapeRegex(path.resolve(moduleRoot, 'node_modules'))}/.*`),
].concat(config.resolver.blockList || []);

module.exports = config;
