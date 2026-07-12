import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import AccountProfilePanel from "@/features/account/AccountProfilePanel";
import AccountSecuritySettings from "@/features/account/AccountSecuritySettings";
import AccountWorkspaceShell from "@/features/account/AccountWorkspaceShell";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";

type Props = {params: Promise<{lang: string}>};
export const dynamic = "force-dynamic";
export async function generateMetadata({params}: Props): Promise<Metadata> { const {lang} = await params; const t = await getTranslations({locale: lang as Locale, namespace: "accountPage.meta"}); return {title: t("title"), robots: {index: false, follow: false}}; }

export default async function AccountPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "accountPage"});
    const user = await requireAuthenticatedUser(locale);
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nameUnavailable");
    const contactValue = user.email ?? user.phone ?? t("notProvided");
    const dateOfBirth = user.dateOfBirth ? new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-US", {dateStyle: "medium"}).format(new Date(`${user.dateOfBirth}T00:00:00`)) : t("notProvided");
    return <AccountWorkspaceShell active="profile" locale={locale} user={user}><section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"><div className="space-y-4"><AccountProfilePanel contactValue={contactValue} dateOfBirth={dateOfBirth} displayName={displayName} user={user} /><div className="grid gap-3 sm:grid-cols-2"><InfoCard label={t("phone")} value={user.phone ?? t("notProvided")} /><InfoCard label={t("email")} value={user.email ?? t("notProvided")} /><InfoCard label={t("dateOfBirth")} value={dateOfBirth} /></div></div><aside><AccountSecuritySettings user={user} /></aside></section></AccountWorkspaceShell>;
}

function InfoCard({label, value}: {label: string; value: string}) { return <div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 break-words text-sm font-medium text-stone-950">{value}</p></div>; }
