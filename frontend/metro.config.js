const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force axios to use browser build instead of Node.js build
// The Node.js build (dist/node/axios.cjs) requires crypto, http2, etc.
// which don't exist in React Native
const axiosBrowserPath = path.resolve(
  __dirname,
  'node_modules/axios/dist/browser/axios.cjs'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // When someone imports 'axios', redirect to the browser build
  if (moduleName === 'axios') {
    return {
      filePath: axiosBrowserPath,
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
