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
    showSpecialist: boolean;
    showFinance: boolean;
};

const baseClassName = "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const defaultClassName = `${baseClassName} border border-stone-200 bg-white text-stone-700 hover:bg-stone-100`;
const activeClassName = `${baseClassName} bg-stone-900 text-white hover:bg-stone-700`;

export default function ManagementNavigation({locale, showNews, showUsers, showOffices, showServices, showSpecialist, showFinance}: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const newsHref = withLocale("/admin/news", locale);
    const usersHref = withLocale("/admin/users", locale);
    const officesHref = withLocale("/admin/offices", locale);
    const servicesHref = withLocale("/admin/services", locale);
    const scheduleHref = withLocale("/admin/schedule", locale);
    const financeHref = withLocale("/admin/finance", locale);

    return (
        <nav className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label={t("label")}>
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
            {showSpecialist ? (
                <Link
                    aria-current={pathname === scheduleHref ? "page" : undefined}
                    className={pathname === scheduleHref ? activeClassName : defaultClassName}
                    href={scheduleHref}
                >
                    {t("specialist")}
                </Link>
            ) : null}
            {showFinance ? (
                <Link
                    aria-current={pathname === financeHref ? "page" : undefined}
                    className={pathname === financeHref ? activeClassName : defaultClassName}
                    href={financeHref}
                >
                    {t("finance")}
                </Link>
            ) : null}
        </nav>
    );
}
