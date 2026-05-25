import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {Suspense} from "react";
import Link from "next/link";
import {withLocale} from "@/shared/lib/locale/withLocale";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import AuthenticatedLink from "@/features/auth/AuthenticatedLink";

type Props = {
    params: Promise<{lang: string}>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const t = await getTranslations({locale: lang as Locale, namespace: "accountPage.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AccountPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "accountPage"});
    const user = await requireAuthenticatedUser();
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nameUnavailable");

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto p-3 sm:p-5">
            <section className="management-workspace mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] flex-col rounded-2xl border border-stone-200/80 bg-stone-50/95 shadow-2xl backdrop-blur-sm sm:min-h-[calc(100vh-2.5rem)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-4 py-4 sm:px-6">
                    <Link
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        href={withLocale("/", locale)}
                    >
                        {t("back")}
                    </Link>
                    <div className="flex items-center gap-4">
                        <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession tone="light" />
                        </Suspense>
                        <AuthSessionPanel loading={false} tone="light" user={user} variant="management" />
                    </div>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-[190px_minmax(0,1fr)]">
                    <nav className="flex flex-wrap content-start gap-2 md:flex-col">
                        <AuthenticatedLink
                            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
                            fallbackHref={withLocale("/auth?mode=login", locale)}
                            href={withLocale("/account", locale)}
                        >
                            {t("title")}
                        </AuthenticatedLink>
                        {user.role === "ADMIN" ? (
                            <>
                                <AuthenticatedLink
                                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                                    fallbackHref={withLocale("/auth?mode=login", locale)}
                                    href={withLocale("/admin", locale)}
                                >
                                    {t("admin")}
                                </AuthenticatedLink>
                                <AuthenticatedLink
                                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                                    fallbackHref={withLocale("/auth?mode=login", locale)}
                                    href={withLocale("/admin/news", locale)}
                                >
                                    {t("manageNews")}
                                </AuthenticatedLink>
                            </>
                        ) : null}
                    </nav>
                    <div className="management-content w-full max-w-2xl space-y-5 rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:p-8">
                        <h1 className="text-3xl font-bold">{t("title")}</h1>
                        <p className="text-stone-600">{t("subtitle")}</p>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="text-sm text-stone-500">{t("name")}</p>
                            <p className="mt-1 text-lg font-medium text-stone-900">{displayName}</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
