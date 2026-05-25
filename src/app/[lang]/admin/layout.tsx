import type {ReactNode} from "react";
import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {requireAdmin} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

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
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("account");

    return (
        <main className="container mx-auto px-4 py-10">
            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
                <aside className="rounded-lg border border-stone-200 bg-stone-50 p-5">
                    <p className="mb-6 text-sm text-stone-600">{displayName}</p>
                    <nav className="flex flex-col gap-3" aria-label={t("navigation.label")}>
                        <Link className="font-medium text-stone-900 hover:underline" href={withLocale("/admin", locale)}>
                            {t("navigation.dashboard")}
                        </Link>
                        <Link className="font-medium text-stone-900 hover:underline" href={withLocale("/admin/news", locale)}>
                            {t("navigation.news")}
                        </Link>
                    </nav>
                </aside>
                <section>{children}</section>
            </div>
        </main>
    );
}
