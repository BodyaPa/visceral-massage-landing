"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

type Props = {
    locale: Locale;
    showNews: boolean;
    showUsers: boolean;
    showOffices: boolean;
    showServices: boolean;
};

const baseClassName = "rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const defaultClassName = `${baseClassName} border border-stone-200 bg-white text-stone-700 hover:bg-stone-100`;
const activeClassName = `${baseClassName} bg-stone-900 text-white hover:bg-stone-700`;

export default function AdminNavigation({locale, showNews, showUsers, showOffices, showServices}: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const adminHref = withLocale("/admin", locale);
    const newsHref = withLocale("/admin/news", locale);
    const usersHref = withLocale("/admin/users", locale);
    const officesHref = withLocale("/admin/offices", locale);
    const servicesHref = withLocale("/admin/services", locale);

    return (
        <nav className="flex flex-wrap content-start gap-2 md:flex-col" aria-label={t("label")}>
            <Link
                className={defaultClassName}
                href={withLocale("/account", locale)}
            >
                {t("account")}
            </Link>
            <Link
                className={pathname === adminHref ? activeClassName : defaultClassName}
                href={adminHref}
                aria-current={pathname === adminHref ? "page" : undefined}
            >
                {t("dashboard")}
            </Link>
            {showNews ? (
                <Link
                    className={pathname === newsHref ? activeClassName : defaultClassName}
                    href={newsHref}
                    aria-current={pathname === newsHref ? "page" : undefined}
                >
                    {t("news")}
                </Link>
            ) : null}
            {showUsers ? (
                <Link
                    className={pathname === usersHref ? activeClassName : defaultClassName}
                    href={usersHref}
                    aria-current={pathname === usersHref ? "page" : undefined}
                >
                    {t("users")}
                </Link>
            ) : null}
            {showOffices ? (
                <Link
                    className={pathname === officesHref ? activeClassName : defaultClassName}
                    href={officesHref}
                    aria-current={pathname === officesHref ? "page" : undefined}
                >
                    {t("offices")}
                </Link>
            ) : null}
            {showServices ? (
                <Link
                    className={pathname === servicesHref ? activeClassName : defaultClassName}
                    href={servicesHref}
                    aria-current={pathname === servicesHref ? "page" : undefined}
                >
                    {t("services")}
                </Link>
            ) : null}
        </nav>
    );
}
