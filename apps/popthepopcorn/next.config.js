/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.example.com'],
  },
  // Security: Don't ignore build errors
  typescript: {
    // Don't ignore TypeScript errors - fix them instead
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't ignore ESLint errors - fix them instead
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
