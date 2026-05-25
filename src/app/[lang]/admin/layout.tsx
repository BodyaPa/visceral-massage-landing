import type {ReactNode} from "react";
import Link from "next/link";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {requireAdmin} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";

type Props = {
    children: ReactNode;
    params: Promise<{lang: string}>;
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({children, params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const user = await requireAdmin();
    const t = await getTranslations({locale, namespace: "admin"});

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto p-4 sm:p-6">
            <div className="flex min-h-full w-full items-center justify-center py-12">
                <div className="w-full max-w-6xl space-y-5 rounded-2xl border border-stone-200/80 bg-stone-50/95 p-5 shadow-2xl backdrop-blur-sm sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                        <nav className="flex flex-wrap items-center gap-4" aria-label={t("navigation.label")}>
                            <Link className="font-medium text-stone-900 hover:underline" href={withLocale("/admin", locale)}>
                                {t("navigation.dashboard")}
                            </Link>
                            <Link className="font-medium text-stone-900 hover:underline" href={withLocale("/admin/news", locale)}>
                                {t("navigation.news")}
                            </Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <Suspense fallback={null}>
                                <LanguageSwitcher />
                            </Suspense>
                            <AuthSessionPanel loading={false} tone="light" user={user} />
                        </div>
                    </div>
                    <section>{children}</section>
                </div>
            </div>
        </main>
    );
}
