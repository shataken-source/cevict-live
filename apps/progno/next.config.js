/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable type checking during build (run separately with tsc --noEmit)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Silence "multiple lockfiles" warning: use current dir (progno) as Turbopack root
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;
