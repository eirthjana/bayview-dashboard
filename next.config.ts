import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is what the Dockerfile copies (.next/standalone + server.js).
  // Vercel builds with its own bundler and breaks when it is on (vercel/next.js#96646,
  // ENOENT .next/next-server.js.nft.json), so it is left off there. Vercel sets
  // VERCEL=1 during its build; Docker and local builds do not.
  output: process.env.VERCEL ? undefined : "standalone",
  // pdf-parse (via pdfjs-dist) dynamically resolves its worker script at
  // runtime relative to its own module path. Neither webpack's bundling nor
  // the standalone-output file tracer can follow that dynamic path, so the
  // worker file gets silently dropped and production throws "Setting up
  // fake worker failed: Cannot find module '.../pdf.worker.mjs'". Excluding
  // the package from bundling (so it's require()'d from node_modules as-is)
  // plus force-including its worker files in the trace fixes both halves.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/documents/upload": ["./node_modules/pdfjs-dist/**/*.mjs"],
  },
};

export default nextConfig;
