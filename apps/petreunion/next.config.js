/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable automatic trailing slashes to prevent redirect loops
  trailingSlash: false,
  
  // Ensure proper redirects
  async redirects() {
    return []
  },
  
  // Disable X-Powered-By header
  poweredByHeader: false,
  
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,

}

module.exports = nextConfig
