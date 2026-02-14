/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
    // Exclude native .node files from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Externalize onnxruntime-node and sharp binaries for API routes
    config.externals = config.externals || [];
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
      'sharp': 'commonjs sharp',
    });
    
    return config;
  },
}
module.exports = nextConfig
