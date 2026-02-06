/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: { root: process.cwd() },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [{ source: '/moltbook', destination: '/', permanent: false }]
  },
}
module.exports = nextConfig
