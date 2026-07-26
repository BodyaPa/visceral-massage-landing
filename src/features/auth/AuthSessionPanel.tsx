"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {logout, type AuthenticatedUser} from "./auth.client";
import {hasAdministrationSection} from "./auth.roles";
import AuthenticatedLink from "./AuthenticatedLink";
import Link from "next/link";
import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";
import {initialsFromName} from "@/shared/lib/text/initials";

type Props = {
    user: AuthenticatedUser | null;
    loading: boolean;
    onLogout?: () => void;
    tone?: "dark" | "light";
    variant?: "menu" | "management" | "account";
};

export default function AuthSessionPanel({user, loading, onLogout, tone = "dark", variant = "menu"}: Props) {
    const locale = useLocale() as Locale;
    const t = useTranslations("nav");
    const router = useRouter();
    const pathname = usePathname();
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const displayName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || t("account")
        : "";
    const accountHref = withLocale("/account", locale);
    const bookingsHref = withLocale("/account/bookings", locale);
    const membershipsHref = withLocale("/account/certificates", locale);
    const pointsHref = withLocale("/account/points", locale);
    const adminHref = withLocale("/admin", locale);
    const accountActive = isActivePath(pathname, accountHref);
    const adminActive = isActivePath(pathname, adminHref);
    const accountTriggerClassName = tone === "light"
        ? "group inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-stone-900 shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-stone-400 hover:bg-stone-50 hover:shadow active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
        : "group inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-white/25 bg-black/25 px-2 py-1.5 text-white shadow-sm outline-none backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-white/45 hover:bg-black/40 hover:shadow active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 motion-reduce:transition-none";
    const menuClassName = `relative min-w-0 max-w-full text-sm ${tone === "light" ? "text-stone-800" : "text-white"}`;
    const dropdownClassName = `${variant === "menu" ? "absolute right-0 top-[calc(100%+0.5rem)]" : "fixed right-3 top-16"} z-[80] flex w-max min-w-48 max-w-[min(82vw,16rem)] flex-col gap-0.5 rounded-xl border p-1.5 shadow-xl backdrop-blur-xl motion-safe:animate-[popover-in_180ms_ease-out_both] motion-reduce:animate-none ${tone === "light" ? "border-stone-200 bg-stone-50/98 text-stone-800" : "border-white/15 bg-stone-950/95 text-white"}`;
    const menuItemClassName = `block w-full rounded-lg px-3 py-2 text-left text-sm no-underline outline-none transition-colors focus-visible:ring-2 focus-visible:ring-current disabled:cursor-wait disabled:opacity-70 ${tone === "light" ? "hover:bg-stone-200/75" : "hover:bg-white/10"}`;

    useEffect(() => {
        function closeOnOutsideClick(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    async function handleLogout() {
        setSubmitting(true);
        try {
            await logout();
            toast.success(t("logoutSuccess"));
            onLogout?.();
            router.replace(withLocale("/", locale));
            router.refresh();
        } catch {
            toast.error(t("logoutError"));
            setSubmitting(false);
        }
    }

    if (loading) {
        return <span className="block min-h-10 min-w-16" aria-hidden="true">&nbsp;</span>;
    }

    if (!user) {
        return (
            <div className={`flex items-center gap-1.5 whitespace-nowrap text-sm ${tone === "light" ? "text-stone-700" : "text-white"}`}>
                <Link className="rounded px-1 py-2 font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" href={withLocale("/auth?mode=login", locale)}>{t("login")}</Link>
                <span aria-hidden="true">|</span>
                <Link className="rounded px-1 py-2 font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" href={withLocale("/auth?mode=register", locale)}>{t("register")}</Link>
            </div>
        );
    }

    return (
        <div className={menuClassName} ref={menuRef}>
            <button
                aria-label={t("accountMenu", {name: displayName})}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className={accountTriggerClassName}
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
            >
                {user.avatarMediaUrl ? (
                    <span
                        aria-hidden="true"
                        className="h-8 w-8 shrink-0 rounded-full border border-current/20 bg-stone-200 bg-cover bg-center shadow-sm"
                        style={{backgroundImage: `url(${resolveApiMediaUrl(user.avatarMediaUrl)})`}}
                    />
                ) : (
                    <span aria-hidden="true" className={tone === "light" ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-bold text-white" : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-stone-950"}>
                        {initialsFromName(displayName, t("account").slice(0, 1).toUpperCase())}
                    </span>
                )}
                <span className="hidden min-w-0 max-w-40 truncate text-sm font-semibold sm:block">{displayName}</span>
                <span aria-hidden="true" className={`text-base leading-none transition-transform duration-200 motion-reduce:transition-none ${menuOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {menuOpen ? (
                <div className={dropdownClassName} role="menu">
                    <AuthenticatedLink
                        aria-current={accountActive ? "page" : undefined}
                        className={`${menuItemClassName} ${accountActive ? tone === "light" ? "bg-stone-200 shadow-[inset_3px_0_0_currentColor]" : "bg-white/15 shadow-[inset_3px_0_0_currentColor]" : ""}`}
                        fallbackHref={withLocale("/auth?mode=login", locale)}
                        href={accountHref}
                        onSessionExpired={onLogout}
                        role="menuitem"
                    >
                        {t("personalAccount")}
                    </AuthenticatedLink>
                    <AuthenticatedLink
                        className={menuItemClassName}
                        fallbackHref={withLocale("/auth?mode=login", locale)}
                        href={bookingsHref}
                        onSessionExpired={onLogout}
                        role="menuitem"
                    >
                        {t("myBookings")}
                    </AuthenticatedLink>
                    <AuthenticatedLink
                        className={menuItemClassName}
                        fallbackHref={withLocale("/auth?mode=login", locale)}
                        href={membershipsHref}
                        onSessionExpired={onLogout}
                        role="menuitem"
                    >
                        {t("myMemberships")}
                    </AuthenticatedLink>
                    <AuthenticatedLink
                        className={menuItemClassName}
                        fallbackHref={withLocale("/auth?mode=login", locale)}
                        href={pointsHref}
                        onSessionExpired={onLogout}
                        role="menuitem"
                    >
                        {t("myPoints")}
                    </AuthenticatedLink>
                    {hasAdministrationSection(user) ? (
                        <AuthenticatedLink
                            aria-current={adminActive ? "page" : undefined}
                            className={`${menuItemClassName} ${adminActive ? tone === "light" ? "bg-stone-200 shadow-[inset_3px_0_0_currentColor]" : "bg-white/15 shadow-[inset_3px_0_0_currentColor]" : ""}`}
                            fallbackHref={withLocale("/auth?mode=login", locale)}
                            href={adminHref}
                            onSessionExpired={onLogout}
                            role="menuitem"
                        >
                            {t("admin")}
                        </AuthenticatedLink>
                    ) : null}
                    <button
                        className={menuItemClassName}
                        disabled={submitting}
                        onClick={handleLogout}
                        role="menuitem"
                        type="button"
                    >
                        {submitting ? t("loggingOut") : t("logout")}
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function isActivePath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}
