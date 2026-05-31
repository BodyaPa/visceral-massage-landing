"use client";

import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import AuthenticatedLink from "@/features/auth/AuthenticatedLink";

type Props = {
    locale: Locale;
    showNews: boolean;
    showUsers: boolean;
};

const baseClassName = "rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const defaultClassName = `${baseClassName} border border-stone-200 bg-white text-stone-700 hover:bg-stone-100`;
const activeClassName = `${baseClassName} bg-stone-900 text-white hover:bg-stone-700`;

export default function AdminNavigation({locale, showNews, showUsers}: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const fallbackHref = withLocale("/auth?mode=login", locale);
    const adminHref = withLocale("/admin", locale);
    const newsHref = withLocale("/admin/news", locale);
    const usersHref = withLocale("/admin/users", locale);

    return (
        <nav className="flex flex-wrap content-start gap-2 md:flex-col" aria-label={t("label")}>
            <AuthenticatedLink
                className={defaultClassName}
                fallbackHref={fallbackHref}
                href={withLocale("/account", locale)}
            >
                {t("account")}
            </AuthenticatedLink>
            <AuthenticatedLink
                className={pathname === adminHref ? activeClassName : defaultClassName}
                fallbackHref={fallbackHref}
                href={adminHref}
                aria-current={pathname === adminHref ? "page" : undefined}
            >
                {t("dashboard")}
            </AuthenticatedLink>
            {showNews ? (
                <AuthenticatedLink
                    className={pathname === newsHref ? activeClassName : defaultClassName}
                    fallbackHref={fallbackHref}
                    href={newsHref}
                    aria-current={pathname === newsHref ? "page" : undefined}
                >
                    {t("news")}
                </AuthenticatedLink>
            ) : null}
            {showUsers ? (
                <AuthenticatedLink
                    className={pathname === usersHref ? activeClassName : defaultClassName}
                    fallbackHref={fallbackHref}
                    href={usersHref}
                    aria-current={pathname === usersHref ? "page" : undefined}
                >
                    {t("users")}
                </AuthenticatedLink>
            ) : null}
        </nav>
    );
}
