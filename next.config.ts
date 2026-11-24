import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / server-only packages must not be bundled by Next.
  serverExternalPackages: ["better-sqlite3", "exceljs"],
};

export default nextConfig;
