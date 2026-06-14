import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {Suspense} from "react";
import Link from "next/link";
import {withLocale} from "@/shared/lib/locale/withLocale";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import AccountBookingsPanel from "@/features/account/AccountBookingsPanel";
import AccountProfileForm from "@/features/account/AccountProfileForm";

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
    const user = await requireAuthenticatedUser(locale);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nameUnavailable");
    const contactValue = user.email ?? user.phone ?? t("notProvided");
    const dateOfBirth = user.dateOfBirth ? formatDate(user.dateOfBirth, locale) : t("notProvided");

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto overflow-x-clip p-2 sm:p-5">
            <section className="account-workspace mx-auto flex w-full max-w-6xl flex-col rounded-2xl border border-stone-200/80 bg-stone-50/95 shadow-2xl backdrop-blur-sm">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                    <Link
                        className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        href={withLocale("/", locale)}
                    >
                        {t("back")}
                    </Link>
                    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession tone="light" />
                        </Suspense>
                        <AuthSessionPanel loading={false} tone="light" user={user} variant="account" />
                    </div>
                </div>
                <div className="account-layout min-w-0 p-3 sm:p-6">
                    <div className="w-full min-w-0 space-y-5 rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-8">
                            <div className="flex flex-col gap-3 border-b border-stone-100 pb-5 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
                                    <p className="mt-2 max-w-2xl text-sm text-stone-600 sm:text-base">{t("subtitle")}</p>
                                </div>
                                <span className="w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                                    ID {user.id}
                                </span>
                            </div>

                            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                                        <p className="text-sm font-medium text-stone-500">{t("profileSection")}</p>
                                        <p className="mt-2 text-xl font-semibold text-stone-950">{displayName}</p>
                                        <p className="mt-1 break-words text-sm text-stone-600">{contactValue}</p>
                                    </div>

                                    <AccountProfileForm user={user} />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <InfoCard label={t("phone")} value={user.phone ?? t("notProvided")} />
                                        <InfoCard label={t("email")} value={user.email ?? t("notProvided")} />
                                        <InfoCard label={t("dateOfBirth")} value={dateOfBirth} />
                                    </div>
                                </div>

                                <aside className="space-y-4">
                                    <section className="rounded-xl border border-stone-200 bg-white p-4">
                                        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("rolesSection")}</h2>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {user.roles.map((role) => (
                                                <RoleBadge key={role} label={t(`roles.${role}`)} />
                                            ))}
                                        </div>
                                        <p className="mt-3 text-sm text-stone-600">{t("rolesHint")}</p>
                                    </section>

                                    <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                                        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("securitySection")}</h2>
                                        <p className="mt-2 text-sm text-stone-700">{t("securityText")}</p>
                                        <Link
                                            className="mt-3 inline-flex rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                                            href={withLocale("/auth?mode=recovery", locale)}
                                        >
                                            {t("securityAction")}
                                        </Link>
                                    </section>
                                </aside>
                            </section>

                            <AccountBookingsPanel locale={locale} />

                            <section className="rounded-xl border border-red-200 bg-red-50/70 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-red-950">{t("deleteSection")}</h2>
                                        <p className="mt-1 max-w-2xl text-sm text-red-900/75">{t("deleteText")}</p>
                                    </div>
                                    <button
                                        className="w-fit rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-sm font-medium text-red-300"
                                        disabled
                                        type="button"
                                    >
                                        {t("deleteAction")}
                                    </button>
                                </div>
                                <p className="mt-3 text-xs text-red-900/65">{t("deleteDeferred")}</p>
                            </section>
                    </div>
                </div>
            </section>
        </main>
    );
}

function InfoCard({label, value}: {label: string; value: string}) {
    return (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
            <p className="mt-2 break-words text-sm font-medium text-stone-950">{value}</p>
        </div>
    );
}

function formatDate(value: string, locale: Locale) {
    return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-US", {dateStyle: "medium"}).format(new Date(`${value}T00:00:00`));
}

function RoleBadge({label}: {label: string}) {
    return (
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
            {label}
        </span>
    );
}
