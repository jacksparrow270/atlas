import type { NextConfig } from "next";
const config: NextConfig = {
  // Keep browser QA independent of the signed-in development server.
  distDir: process.env.ATLAS_TEST_WORKSPACE === "1" ? ".next-test" : ".next",
};
export default config;
