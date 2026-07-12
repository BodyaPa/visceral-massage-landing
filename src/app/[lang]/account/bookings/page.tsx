import AccountBookingsPanel from "@/features/account/AccountBookingsPanel";
import AccountWorkspaceShell from "@/features/account/AccountWorkspaceShell";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
export const dynamic = "force-dynamic";
export async function generateMetadata({params}: {params: Promise<{lang: string}>}): Promise<Metadata> { const {lang} = await params; const t = await getTranslations({locale: lang as Locale, namespace: "accountPage.pageTitles"}); return {title: t("bookings"), robots: {index: false, follow: false}}; }
export default async function Page({params}: {params: Promise<{lang: string}>}) { const {lang} = await params; const locale = lang as Locale; const user = await requireAuthenticatedUser(locale); return <AccountWorkspaceShell active="bookings" locale={locale} user={user}><AccountBookingsPanel locale={locale} /></AccountWorkspaceShell>; }
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
