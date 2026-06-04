const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite'],
    blockList: exclusionList([
      /backend\/\.aws-sam\/.*/,
      /backend\/dist\/.*/,
      /backend\/node_modules\/.*/,
    ]),
  },
});
