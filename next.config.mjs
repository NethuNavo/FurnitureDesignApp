import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Prevent Next from inferring the monorepo root incorrectly when multiple
    // lockfiles exist above this app directory on Windows.
    root: __dirname,
  },
};

export default nextConfig;

