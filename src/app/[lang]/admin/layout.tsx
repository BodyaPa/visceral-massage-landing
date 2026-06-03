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
import {hasRole} from "@/features/auth/auth.roles";

type Props = {
    children: ReactNode;
    params: Promise<{lang: string}>;
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({children, params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const user = await requireAnyRole(["MASTER", "SPECIALIST", "FINANCE_MANAGER", "SMM"], locale);
    const t = await getTranslations({locale, namespace: "admin"});

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto p-3 sm:p-5">
            <section className="management-workspace mx-auto flex min-h-[calc(100vh-1.5rem)] w-fit max-w-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/95 shadow-2xl backdrop-blur-sm sm:min-h-[calc(100vh-2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-4 py-4 sm:px-6">
                    <Link
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        href={withLocale("/", locale)}
                    >
                        {t("navigation.home")}
                    </Link>
                    <div className="flex items-center gap-4">
                        <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession tone="light" />
                        </Suspense>
                        <AuthSessionPanel loading={false} tone="light" user={user} variant="management" />
                    </div>
                </div>
                <div className="management-layout grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 p-4 sm:p-6 md:grid-cols-[180px_minmax(0,max-content)] xl:grid-cols-[200px_minmax(0,max-content)]">
                    <ManagementNavigation
                        locale={locale}
                        showNews={hasRole(user, "SMM")}
                        showUsers={hasRole(user, "MASTER")}
                        showOffices={hasRole(user, "MASTER")}
                        showServices={hasRole(user, "MASTER")}
                        showSpecialist={hasRole(user, "SPECIALIST")}
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
