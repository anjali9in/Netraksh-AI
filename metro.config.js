const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts} = defaultConfig.resolver;

const config = {
  resolver: {
    assetExts: [...assetExts, 'tflite'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
