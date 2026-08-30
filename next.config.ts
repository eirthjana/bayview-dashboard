import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
