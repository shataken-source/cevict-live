const path = require('path');

module.exports = {
  reactStrictMode: true,
  // Hint root to avoid multi-lockfile warnings
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  typescript: {
    ignoreBuildErrors: true,
  },
};
