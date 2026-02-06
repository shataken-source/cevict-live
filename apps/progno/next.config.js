/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use this app dir as Turbopack root so the multi-lockfile warning goes away
  turbopack: { root: process.cwd() },
};

export default nextConfig;