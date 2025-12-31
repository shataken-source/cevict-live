/** @type {import("next").NextConfig} */
const nextConfig = {
  // Removed "standalone" output - that's for Docker, not Vercel
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}
module.exports = nextConfig
