import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/timesheet/**": ["./src/lib/timesheet/template.xlsx"],
  },
};

export default nextConfig;
