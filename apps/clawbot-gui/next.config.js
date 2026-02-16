/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/exec',
        destination: 'http://localhost:3005/api/exec',
      },
    ];
  },
}

module.exports = nextConfig
