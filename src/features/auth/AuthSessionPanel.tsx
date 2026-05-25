"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import styles from "@/components/layout/header/HeaderStyles.module.scss";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {logout, type AuthenticatedUser} from "./auth.client";

type Props = {
    user: AuthenticatedUser | null;
    loading: boolean;
    onLogout: () => void;
};

export default function AuthSessionPanel({user, loading, onLogout}: Props) {
    const locale = useLocale() as Locale;
    const t = useTranslations("nav");
    const router = useRouter();
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);

    async function handleLogout() {
        setSubmitting(true);
        try {
            await logout();
            toast.success(t("logoutSuccess"));
            onLogout();
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

    return (
        <div className={styles.authActions}>
            <span className={styles.accountText}>
                {[user.firstName, user.lastName].filter(Boolean).join(" ") || t("account")}
            </span>
            {user.role === "ADMIN" ? <Link className={styles.authLink} href={withLocale("/admin", locale)}>{t("admin")}</Link> : null}
            <span aria-hidden="true">|</span>
            <button className={styles.authButton} type="button" disabled={submitting} onClick={handleLogout}>
                {submitting ? t("loggingOut") : t("logout")}
            </button>
        </div>
    );
}
