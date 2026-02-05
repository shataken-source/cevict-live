/** @type {import("next").NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [{ source: '/moltbook', destination: '/', permanent: false }]
  },
}
module.exports = nextConfig
