import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import PublicSchedulePage from "@/features/schedule/PublicSchedulePage";

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
        alternates: getAlternates("/calendar", locale),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function CalendarPage({params}: Props) {
    const {lang} = await params;
    await requireAuthenticatedUser(lang as Locale);

    return <PublicSchedulePage />;
}
