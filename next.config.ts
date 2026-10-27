import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  // Onlook config retained but disabled — @onlook/nextjs@2.1.1 is built
  // against an older swc_core than Next 16 ships, so the SWC plugin crashes
  // on every JSX module. Re-enable once @onlook/nextjs ≥ Next-16-compatible
  // is published. See README for status.
  // experimental: {
  //   swcPlugins: [["@onlook/nextjs", { root: process.cwd() }]],
  // },
};

export default nextConfig;
