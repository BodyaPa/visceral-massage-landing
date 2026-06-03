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

export default function ManagementNavigation({locale, showNews, showUsers, showOffices, showServices}: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const newsHref = withLocale("/admin/news", locale);
    const usersHref = withLocale("/admin/users", locale);
    const officesHref = withLocale("/admin/offices", locale);
    const servicesHref = withLocale("/admin/services", locale);

    return (
        <nav className="flex flex-wrap content-start gap-2 md:flex-col" aria-label={t("label")}>
            {showNews ? (
                <Link
                    aria-current={pathname === newsHref ? "page" : undefined}
                    className={pathname === newsHref ? activeClassName : defaultClassName}
                    href={newsHref}
                >
                    {t("news")}
                </Link>
            ) : null}
            {showUsers ? (
                <Link
                    aria-current={pathname === usersHref ? "page" : undefined}
                    className={pathname === usersHref ? activeClassName : defaultClassName}
                    href={usersHref}
                >
                    {t("users")}
                </Link>
            ) : null}
            {showOffices ? (
                <Link
                    aria-current={pathname === officesHref ? "page" : undefined}
                    className={pathname === officesHref ? activeClassName : defaultClassName}
                    href={officesHref}
                >
                    {t("offices")}
                </Link>
            ) : null}
            {showServices ? (
                <Link
                    aria-current={pathname === servicesHref ? "page" : undefined}
                    className={pathname === servicesHref ? activeClassName : defaultClassName}
                    href={servicesHref}
                >
                    {t("services")}
                </Link>
            ) : null}
        </nav>
    );
}
