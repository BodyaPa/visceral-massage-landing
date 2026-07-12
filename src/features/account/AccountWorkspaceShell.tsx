import type {ReactNode} from "react";
import {Suspense} from "react";
import Link from "next/link";
import {getTranslations} from "next-intl/server";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import type {AuthenticatedUser} from "@/features/auth/auth.client";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

type Section = "profile" | "bookings" | "certificates" | "points";

export default async function AccountWorkspaceShell({active, children, locale, user}: {active: Section; children: ReactNode; locale: Locale; user: AuthenticatedUser}) {
    const t = await getTranslations({locale, namespace: "accountPage"});
    const links: Array<{key: Section; href: string}> = [
        {key: "profile", href: "/account"},
        {key: "bookings", href: "/account/bookings"},
        {key: "certificates", href: "/account/certificates"},
        {key: "points", href: "/account/points"}
    ];

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto overflow-x-clip p-2 sm:p-5">
            <section className="account-workspace mx-auto flex w-full max-w-6xl flex-col rounded-2xl border border-stone-200/80 bg-stone-50/95 shadow-2xl backdrop-blur-sm">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                    <Link className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100" href={withLocale("/", locale)}>{t("back")}</Link>
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <Suspense fallback={null}><LanguageSwitcher requiresSession tone="light" /></Suspense>
                        <AuthSessionPanel loading={false} tone="light" user={user} variant="account" />
                    </div>
                </div>
                <div className="account-layout min-w-0 p-3 sm:p-6">
                    <div className="w-full min-w-0 space-y-5 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-8">
                        <header className="border-b border-stone-100 pb-5">
                            <h1 className="text-2xl font-semibold text-stone-950 sm:text-3xl">{t(`pageTitles.${active}`)}</h1>
                            <p className="mt-2 max-w-2xl text-sm text-stone-600 sm:text-base">{t(`pageSubtitles.${active}`)}</p>
                        </header>
                        <nav aria-label={t("sectionNavigation")} className="flex max-w-full gap-2 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 p-2">
                            {links.map((item) => <Link aria-current={active === item.key ? "page" : undefined} className={active === item.key ? activeLinkClass : linkClass} href={withLocale(item.href, locale)} key={item.key}>{t(`sections.${item.key}`)}</Link>)}
                        </nav>
                        {children}
                    </div>
                </div>
            </section>
        </main>
    );
}

const linkClass = "shrink-0 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 hover:bg-white hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500";
const activeLinkClass = "shrink-0 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2";
