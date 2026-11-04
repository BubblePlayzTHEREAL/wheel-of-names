import type { NextConfig } from "next";

// Primary deployment is Vercel, which serves the static export from the
// domain root — no basePath. GitHub Pages project sites are served from a
// subpath, so scripts/deploy-pages.sh sets NEXT_PUBLIC_BASE_PATH to
// /wheel-of-names for those builds. The app is fully client-side
// (localStorage only), so no server runtime is needed.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "export",
  ...(basePath ? { basePath } : {}),
  trailingSlash: true,
};

export default nextConfig;
