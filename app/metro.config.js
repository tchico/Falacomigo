// Lets the app import content packs from /content at the repo root (NFR-07).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '..', 'content')];
// expo-sqlite's web build loads a .wasm file.
config.resolver.assetExts.push('wasm');

module.exports = config;
