import type { NextConfig } from "next";

// Served from GitHub Pages at /wheel-of-names/ — static export with a
// matching basePath. The app is fully client-side (localStorage only),
// so no server runtime is needed.
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "export",
  basePath: "/wheel-of-names",
  trailingSlash: true,
};

export default nextConfig;
