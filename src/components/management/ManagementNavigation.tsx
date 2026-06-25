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

const baseClassName = "group relative flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 motion-reduce:transition-none";
const defaultClassName = `${baseClassName} border-transparent text-stone-600 hover:border-stone-300 hover:bg-white hover:text-stone-950 hover:shadow-sm`;
const activeClassName = `${baseClassName} border-stone-900 bg-stone-950 text-white shadow-sm hover:bg-stone-900`;

type NavigationItem = {
    href: string;
    label: string;
    visible: boolean;
};

export default function ManagementNavigation({locale, showNews, showUsers, showOffices, showServices, showSpecialist, showFinance}: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const newsHref = withLocale("/admin/news", locale);
    const usersHref = withLocale("/admin/users", locale);
    const officesHref = withLocale("/admin/offices", locale);
    const servicesHref = withLocale("/admin/services", locale);
    const scheduleHref = withLocale("/admin/schedule", locale);
    const financeHref = withLocale("/admin/finance", locale);
    const siteSettingsHref = withLocale("/admin/site-settings", locale);
    const items: NavigationItem[] = [
        {href: newsHref, label: t("news"), visible: showNews},
        {href: usersHref, label: t("users"), visible: showUsers},
        {href: officesHref, label: t("offices"), visible: showOffices},
        {href: siteSettingsHref, label: t("siteSettings"), visible: showUsers},
        {href: servicesHref, label: t("services"), visible: showServices},
        {href: scheduleHref, label: t("specialist"), visible: showSpecialist},
        {href: financeHref, label: t("finance"), visible: showFinance}
    ];

    return (
        <nav className="sticky top-2 z-20 max-w-full rounded-2xl border border-stone-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur lg:top-4" aria-label={t("label")}>
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5 lg:flex-col lg:overflow-visible lg:pb-0">
                {items.filter((item) => item.visible).map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                        <Link
                            aria-current={active ? "page" : undefined}
                            className={active ? activeClassName : defaultClassName}
                            href={item.href}
                            key={item.href}
                        >
                            <span className={active ? "h-1.5 w-1.5 shrink-0 rounded-full bg-white" : "h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 transition-colors group-hover:bg-stone-700"} />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

function isActivePath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}
