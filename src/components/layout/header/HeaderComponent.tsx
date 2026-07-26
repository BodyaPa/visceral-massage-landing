"use client";

import {Suspense, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";
import {usePathname} from "next/navigation";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import {getCurrentUser, refreshSession, type AuthenticatedUser} from "@/features/auth/auth.client";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

const SESSION_KEEP_ALIVE_INTERVAL_MS = 45 * 1000;

export default function HeaderComponent() {
    const t = useTranslations("nav");
    const locale = useLocale() as Locale;
    const pathname = usePathname();
    const isAuthPage = pathname.endsWith("/auth") || pathname.endsWith("/login") || pathname.endsWith("/register");
    const isAccountPage = /\/account(?:\/|$)/.test(pathname);
    const isManagementPage = pathname.includes("/admin");
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const links = useMemo(() => [
        {label: t("home"), path: "/"},
        {label: t("news"), path: "/news"},
        {label: t("reviews"), path: "/reviews"},
        ...(user ? [{label: t("calendar"), path: "/calendar"}, {label: t("memberships"), path: "/memberships"}] : []),
        {label: t("about"), path: "/about"},
        {label: t("contact"), path: "/contact"}
    ], [t, user]);

    useEffect(() => {
        let active = true;
        getCurrentUser()
            .then((currentUser) => {if (active) setUser(currentUser);})
            .catch(() => {if (active) setUser(null);})
            .finally(() => {if (active) setSessionLoading(false);});
        return () => {active = false;};
    }, [pathname]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        let refreshing = false;
        const keepSessionAlive = async () => {
            if (document.visibilityState !== "visible" || refreshing) return;
            refreshing = true;
            try {
                await refreshSession();
                const currentUser = await getCurrentUser();
                if (active) setUser(currentUser);
            } catch {
                if (active) setUser(null);
            } finally {
                refreshing = false;
            }
        };
        const keepAliveWhenVisible = () => {if (document.visibilityState === "visible") void keepSessionAlive();};
        const interval = window.setInterval(keepSessionAlive, SESSION_KEEP_ALIVE_INTERVAL_MS);
        window.addEventListener("focus", keepSessionAlive);
        window.addEventListener("pageshow", keepSessionAlive);
        document.addEventListener("visibilitychange", keepAliveWhenVisible);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", keepSessionAlive);
            window.removeEventListener("pageshow", keepSessionAlive);
            document.removeEventListener("visibilitychange", keepAliveWhenVisible);
        };
    }, [user]);

    if (isAccountPage || isManagementPage) return null;

    return (
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 text-stone-950 shadow-sm backdrop-blur-xl">
            <div className="mx-auto flex min-h-16 w-full max-w-[1680px] items-center gap-3 px-3 py-2 sm:px-5">
                <nav aria-label={t("publicNavigation")} className="min-w-0 flex-1 overflow-x-auto">
                    <div className="flex w-max min-w-full items-center gap-1">
                        {links.map((item) => {
                            const href = withLocale(item.path, locale);
                            const active = isActivePath(pathname, href);
                            return <Link aria-current={active ? "page" : undefined} className={active ? activeLinkClass : linkClass} href={href} key={item.path}>{item.label}</Link>;
                        })}
                    </div>
                </nav>
                <div className="flex shrink-0 items-center gap-2">
                    <Suspense fallback={null}><LanguageSwitcher requiresSession={isAuthPage} tone="light" /></Suspense>
                    <AuthSessionPanel key={locale} loading={sessionLoading} onLogout={() => setUser(null)} tone="light" user={user} />
                </div>
            </div>
        </header>
    );
}

function isActivePath(pathname: string, href: string) {
    const normalizedPath = pathname.replace(/\/+$/, "");
    const normalizedHref = href.replace(/\/+$/, "");
    return normalizedPath === normalizedHref || (normalizedHref !== "/ua" && normalizedHref !== "/en" && normalizedPath.startsWith(`${normalizedHref}/`));
}

const linkClass = "inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 outline-none transition-colors duration-200 hover:bg-white hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none";
const activeLinkClass = "inline-flex min-h-10 shrink-0 items-center rounded-lg bg-stone-950 px-3 py-2 text-sm font-semibold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";
