/** @type {import("next").NextConfig} */
// Redeploy trigger: env var fix 2026-02-27
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Disable CSS optimization to fix mini-css-extract-plugin issues
    optimizeCss: false,
  },
  webpack: (config, { isServer }) => {
    // Ensure CSS extraction works properly
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        realContentHash: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
