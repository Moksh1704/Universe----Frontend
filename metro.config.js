const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for Windows + OneDrive: disable Node.js sea shims that cause
// "ENOENT: no such file or directory, mkdir ...node:sea" error
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
