// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Asegurarnos que la configuración es compatible
module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    // En lugar de blacklistRE (obsoleto), usar blockList
    blockList: [
      /node_modules\/.*\/node_modules\/react-native\/.*/,
      /react-native-firebase\/.*\/bridgeless/,
    ]
  },
};