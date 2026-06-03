"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import styles from "@/components/layout/header/HeaderStyles.module.scss";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {logout, type AuthenticatedUser} from "./auth.client";
import {hasAdministrationSection} from "./auth.roles";
import AuthenticatedLink from "./AuthenticatedLink";
import Link from "next/link";

type Props = {
    user: AuthenticatedUser | null;
    loading: boolean;
    onLogout?: () => void;
    tone?: "dark" | "light";
    variant?: "menu" | "management";
};

export default function AuthSessionPanel({user, loading, onLogout, tone = "dark", variant = "menu"}: Props) {
    const locale = useLocale() as Locale;
    const t = useTranslations("nav");
    const router = useRouter();
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const displayName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || t("account")
        : "";

    useEffect(() => {
        if (variant !== "menu") {
            return;
        }

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
    }, [variant]);

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
        return <span className={styles.authText} aria-hidden="true">&nbsp;</span>;
    }

    if (!user) {
        return (
            <div className={styles.authActions}>
                <Link className={styles.authLink} href={withLocale("/auth?mode=login", locale)}>{t("login")}</Link>
                <span aria-hidden="true">|</span>
                <Link className={styles.authLink} href={withLocale("/auth?mode=register", locale)}>{t("register")}</Link>
            </div>
        );
    }

    if (variant === "management") {
        return (
            <div className={`${styles.managementIdentity} ${tone === "light" ? styles.accountMenuLight : ""}`}>
                <span className={styles.accountText}>{displayName}</span>
                <button
                    className={styles.managementLogout}
                    disabled={submitting}
                    onClick={handleLogout}
                    type="button"
                >
                    {submitting ? t("loggingOut") : t("logout")}
                </button>
            </div>
        );
    }

    return (
        <div className={`${styles.accountMenu} ${tone === "light" ? styles.accountMenuLight : ""}`} ref={menuRef}>
            <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className={styles.accountTrigger}
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
            >
                <span className={styles.accountText}>{displayName}</span>
                <span aria-hidden="true" className={`${styles.accountChevron} ${menuOpen ? styles.isOpen : ""}`} />
            </button>
            {menuOpen ? (
                <div className={styles.accountDropdown} role="menu">
                    <AuthenticatedLink
                        className={styles.accountMenuLink}
                        fallbackHref={withLocale("/auth?mode=login", locale)}
                        href={withLocale("/account", locale)}
                        onSessionExpired={onLogout}
                        role="menuitem"
                    >
                        {t("personalAccount")}
                    </AuthenticatedLink>
                    {hasAdministrationSection(user) ? (
                        <AuthenticatedLink
                            className={styles.accountMenuLink}
                            fallbackHref={withLocale("/auth?mode=login", locale)}
                            href={withLocale("/admin", locale)}
                            onSessionExpired={onLogout}
                            role="menuitem"
                        >
                            {t("admin")}
                        </AuthenticatedLink>
                    ) : null}
                    <button
                        className={styles.accountMenuButton}
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
