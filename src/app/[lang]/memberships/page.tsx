import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import MembershipsPage from "@/features/memberships/MembershipsPage";
import type {Locale} from "@/i18n";
import {requireAuthenticatedUser} from "@/features/auth/auth.server";
import {getAlternates} from "@/shared/lib/seo/getAlternates";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "memberships.meta"});

    return {
        alternates: getAlternates("/memberships", locale),
        description: t("description"),
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export const dynamic = "force-dynamic";

export default async function Page({params}: Props) {
    const {lang} = await params;
    await requireAuthenticatedUser(lang as Locale);

    return <MembershipsPage />;
}
