"use client";

import Link, { type LinkProps } from "next/link";
import { useParams } from "next/navigation";
import { ReactNode, AnchorHTMLAttributes } from "react";
import type { Locale } from "@/i18n";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
    Omit<LinkProps, "href"> & {
    href: string;
    children: ReactNode;
    query?: Record<string, string | number | boolean | undefined>;
};

function buildLocalizedHref(
    locale: Locale,
    href: string,
    query?: Record<string, string | number | boolean | undefined>
) {
    const normalizedPath = href.startsWith("/") ? href : `/${href}`;
    const url = new URL(`/${locale}${normalizedPath}`, "http://localhost");

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return `${url.pathname}${url.search}`;
}

export default function LocalizedLink({
                                          href,
                                          query,
                                          children,
                                          ...rest
                                      }: Props) {
    const params = useParams();
    const lang = params.lang as Locale;

    return (
        <Link href={buildLocalizedHref(lang, href, query)} {...rest}>
            {children}
        </Link>
    );
}