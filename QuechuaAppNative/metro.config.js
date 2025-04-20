// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Asegurarnos de que blacklist/blocklist está definido correctamente
module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    // Corregir la forma de bloquear módulos
    blacklistRE: [
      /node_modules\/.*\/node_modules\/react-native\/.*/,
      /react-native-firebase\/.*\/bridgeless/,
    ]
  },
};