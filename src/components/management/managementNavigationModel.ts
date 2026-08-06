import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

export type ManagementNavigationVisibility = {
    showNews: boolean;
    showUsers: boolean;
    showOffices: boolean;
    showServices: boolean;
    showTraining: boolean;
    showSpecialist: boolean;
    showWorkSchedule: boolean;
    showFinance: boolean;
    showAnalytics: boolean;
    showReviews: boolean;
    showRecords: boolean;
    showClients: boolean;
    showSiteSettings: boolean;
    showLegal: boolean;
};

export type ManagementNavigationModel = ManagementNavigationVisibility & {locale: Locale};
type NavigationItem = {href: string; label: string};
export type NavigationGroup = {
    id: "operations" | "clientsUsers" | "catalog" | "finance" | "loyalty" | "content" | "system";
    label: string;
    items: NavigationItem[];
};

export function createNavigationGroups({locale, ...visibility}: ManagementNavigationModel, label: (key: string) => string): NavigationGroup[] {
    const item = (path: string, key: string, visible: boolean): NavigationItem | null => visible ? {href: withLocale(path, locale), label: label(key)} : null;
    const compact = (items: Array<NavigationItem | null>) => items.filter((value): value is NavigationItem => value !== null);
    const candidates: NavigationGroup[] = [
        {id: "operations", label: label("groups.operations"), items: compact([item("/admin/schedule", "specialist", visibility.showSpecialist), item("/admin/work-schedule", "workSchedule", visibility.showWorkSchedule), item("/admin/records", "records", visibility.showRecords)])},
        {id: "clientsUsers", label: label("groups.clientsUsers"), items: compact([item("/admin/clients", "clients", visibility.showClients), item("/admin/users", "users", visibility.showUsers)])},
        {id: "catalog", label: label("groups.catalog"), items: compact([item("/admin/services", "services", visibility.showServices), item("/admin/training", "training", visibility.showTraining), item("/admin/offices", "offices", visibility.showOffices)])},
        {id: "finance", label: label("groups.finance"), items: compact([item("/admin/finance", "finance", visibility.showFinance), item("/admin/analytics", "analytics", visibility.showAnalytics)])},
        {id: "loyalty", label: label("groups.loyalty"), items: compact([item("/admin/loyalty", "loyalty", visibility.showServices), item("/admin/promo-codes", "promos", visibility.showServices)])},
        {id: "content", label: label("groups.content"), items: compact([item("/admin/news", "news", visibility.showNews), item("/admin/reviews", "reviews", visibility.showReviews)])},
        {id: "system", label: label("groups.system"), items: compact([item("/admin/site-settings", "siteSettings", visibility.showSiteSettings), item("/admin/legal", "legal", visibility.showLegal)])}
    ];
    return candidates.filter((group) => group.items.length > 0);
}

export function isActivePath(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}
