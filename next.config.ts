import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ["tailwindcss", "@tailwindcss/postcss"],
};

export default nextConfig;