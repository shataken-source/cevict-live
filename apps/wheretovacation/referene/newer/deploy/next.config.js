const path = require('path');

module.exports = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  poweredByHeader: false,
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.devtool = false;
    
    // Minimal optimization for fastest build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false
      };
    }
    return config;
  }
};
