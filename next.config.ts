import createNextIntlPlugin from 'next-intl/plugin';
import {NextConfig} from "next";

const withNextIntl = createNextIntlPlugin(
    './i18n/request.ts'
);

const nextConfig: NextConfig = {
    reactStrictMode: true,
    transpilePackages: ["tailwindcss", "@tailwindcss/postcss"],
    output: "standalone",
};

export default withNextIntl(nextConfig);