import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import SiteSettingsManagement from "@/features/siteSettings/SiteSettingsManagement";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.siteSettings.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AdminSiteSettingsPage({params}: Props) {
    const {lang} = await params;
    await requireRole("ADMIN", lang as Locale);

    return <SiteSettingsManagement />;
}
