"use client";

import {useTranslations} from "next-intl";
import {useLocale} from "next-intl";
import {usePathname} from "next/navigation";
import LocalizedLink from "@/components/common/LocalizedLink";
import {API_URL} from "@/shared/constants/env";
import type {Locale} from "@/i18n";
import type {SiteSettings} from "@/types/siteSettings";
import {useEffect, useState} from "react";

const hiddenSegments = ["/admin", "/account", "/auth", "/login", "/register"];

export default function FooterComponent() {
    const t = useTranslations("footer");
    const nav = useTranslations("nav");
    const locale = useLocale() as Locale;
    const pathname = usePathname();
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const pathWithoutLocale = pathname.replace(/^\/(ua|en)(?=\/|$)/, "") || "/";
    const shouldHide = hiddenSegments.some((segment) => pathWithoutLocale === segment || pathWithoutLocale.startsWith(`${segment}/`));
    const body = locale === "ua"
        ? settings?.footerBodyUa || t("body")
        : settings?.footerBodyEn || t("body");

    useEffect(() => {
        let active = true;
        fetch(`${API_URL}/api/site-settings`, {credentials: "include"})
            .then((response) => response.ok ? response.json() as Promise<SiteSettings> : null)
            .then((data) => {
                if (active && data) setSettings(data);
            })
            .catch(() => {
                if (active) setSettings(null);
            });
        return () => {
            active = false;
        };
    }, []);

    if (shouldHide) {
        return null;
    }

    return (
        <footer className="border-t border-stone-200 bg-stone-950 text-stone-100">
            <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
                <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-tight">Ataraksia</p>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">{body}</p>
                    <p className="mt-5 text-xs text-stone-500">{t("copyright", {year: new Date().getFullYear()})}</p>
                </div>
                <nav aria-label={t("navigationLabel")} className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 lg:min-w-80">
                    <FooterLink href="/">{nav("home")}</FooterLink>
                    <FooterLink href="/news">{nav("news")}</FooterLink>
                    <FooterLink href="/memberships">{nav("memberships")}</FooterLink>
                    <FooterLink href="/calendar">{nav("calendar")}</FooterLink>
                    <FooterLink href="/about">{nav("about")}</FooterLink>
                    <FooterLink href="/contact">{nav("contact")}</FooterLink>
                </nav>
            </div>
        </footer>
    );
}

function FooterLink({children, href}: {children: string; href: string}) {
    return (
        <LocalizedLink className="w-fit rounded-md px-0 py-1 text-stone-300 transition-colors hover:text-white" href={href}>
            {children}
        </LocalizedLink>
    );
}
