import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import Link from "next/link";
import {withLocale} from "@/shared/lib/locale/withLocale";
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";

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
    const t = await getTranslations({locale: lang as Locale, namespace: "accountPage"});
    const user = await requireAuthenticatedUser();
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("nameUnavailable");

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto p-4 sm:p-6">
            <div className="flex min-h-full w-full items-center justify-center py-14">
                <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-stone-200/80 bg-stone-50/95 p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4">
                        <Link className="text-sm font-medium text-stone-600 transition hover:text-stone-950" href={withLocale("/", lang as Locale)}>
                            {t("back")}
                        </Link>
                        <AuthSessionPanel loading={false} tone="light" user={user} />
                    </div>
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-stone-600">{t("subtitle")}</p>
                    <div className="rounded-lg bg-white p-4">
                        <p className="text-sm text-stone-500">{t("name")}</p>
                        <p className="mt-1 text-lg font-medium text-stone-900">{displayName}</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
