import type { NextConfig } from "next";

const isExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetPrefix = basePath ? `${basePath}/` : "";

const nextConfig: NextConfig = {
  ...(isExport && {
    output: "export",
    basePath,
    assetPrefix,
    images: { unoptimized: true },
  }),
  reactCompiler: true,
};

export default nextConfig;
