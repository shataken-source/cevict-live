import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack root = this app dir (avoids "multiple lockfiles" warning, fixes API route resolution)
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
