/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment-specific configurations
  env: {
    NEXT_PUBLIC_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'test'
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ]
  },
  
  // Rewrites for AI project routing
  async rewrites() {
    const isTest = process.env.NODE_ENV !== 'production'
    
    return [
      // Route to test or production URLs based on environment
      {
        source: '/progno/:path*',
        destination: isTest 
          ? 'https://progno.test.cevict.ai/:path*'
          : 'https://progno.cevict.ai/:path*'
      },
      {
        source: '/orchestrator/:path*',
        destination: isTest
          ? 'https://orchestrator.test.cevict.ai/:path*'
          : 'https://orchestrator.cevict.ai/:path*'
      },
      {
        source: '/massager/:path*',
        destination: isTest
          ? 'https://massager.test.cevict.ai/:path*'
          : 'https://massager.cevict.ai/:path*'
      },
      {
        source: '/claude-effect/:path*',
        destination: isTest
          ? 'https://claude.test.cevict.ai/:path*'
          : 'https://claude.cevict.ai/:path*'
      }
    ]
  },
  
  // Image optimization
  images: {
    domains: ['via.placeholder.com', 'cevict.ai', 'supabase.co']
  }
}

module.exports = nextConfig

