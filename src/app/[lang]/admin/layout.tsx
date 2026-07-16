import type {ReactNode} from "react";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {requireAnyRole} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import Link from "next/link";
import ManagementNavigation from "@/components/management/ManagementNavigation";
import AnimatedManagementContent from "@/components/management/AnimatedManagementContent";
import ManagementScrollReset from "@/components/management/ManagementScrollReset";
import {hasRole} from "@/features/auth/auth.roles";

type Props = {
    children: ReactNode;
    params: Promise<{lang: string}>;
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({children, params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const user = await requireAnyRole(["ADMIN", "SPECIALIST", "FINANCE_MANAGER", "SMM"], locale);
    const t = await getTranslations({locale, namespace: "admin"});

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto overflow-x-clip p-2 sm:p-5" data-management-scroll>
            <ManagementScrollReset />
            <section className="management-workspace mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1680px] flex-col rounded-2xl border border-stone-200/80 bg-stone-50/95 shadow-2xl backdrop-blur-sm sm:min-h-[calc(100vh-2.5rem)]">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-3 print:hidden sm:gap-4 sm:px-6 sm:py-4">
                    <Link
                        className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        href={withLocale("/", locale)}
                    >
                        {t("navigation.home")}
                    </Link>
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession tone="light" />
                        </Suspense>
                        <AuthSessionPanel loading={false} tone="light" user={user} variant="management" />
                    </div>
                </div>
                <div className="management-layout grid w-full flex-1 grid-cols-1 content-start items-start gap-4 p-3 print:block print:p-0 sm:p-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[220px_minmax(0,1fr)] xl:px-8 xl:py-7">
                    <ManagementNavigation
                        locale={locale}
                        showNews={hasRole(user, "SMM")}
                        showUsers={hasRole(user, "ADMIN")}
                        showOffices={hasRole(user, "ADMIN")}
                        showServices={hasRole(user, "ADMIN")}
                        showSpecialist={hasRole(user, "ADMIN") || hasRole(user, "SPECIALIST")}
                        showWorkSchedule={hasRole(user, "ADMIN")}
                        showFinance={hasRole(user, "FINANCE_MANAGER")}
                    />
                    <AnimatedManagementContent>
                        {children}
                    </AnimatedManagementContent>
                </div>
            </section>
        </main>
    );
}
