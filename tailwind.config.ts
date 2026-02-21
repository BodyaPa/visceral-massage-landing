import type { Config } from "tailwindcss";

export default {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/store/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: { extend: {} },
    plugins: [],
} satisfies Config;