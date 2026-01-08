/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  swcMinify: true,
  // Ensure dynamic rendering for pages that hit APIs/Redis to avoid runtime 500s on Vercel static export
  output: 'standalone',
}

module.exports = nextConfig

