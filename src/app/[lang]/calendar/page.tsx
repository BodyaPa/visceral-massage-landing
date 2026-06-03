import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";

type Props = {
    params: Promise<{lang: string}>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "calendar.meta"});

    return {
        title: t("title"),
        description: t("description"),
        alternates: getAlternates("/calendar", locale)
    };
}

export default async function CalendarPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    await requireAuthenticatedUser(locale);
    const t = await getTranslations({locale, namespace: "calendar.page"});

    return (
        <main className="container mx-auto px-4 py-10">
            <section className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="text-base text-muted-foreground">{t("subtitle")}</p>
            </section>
        </main>
    );
}
