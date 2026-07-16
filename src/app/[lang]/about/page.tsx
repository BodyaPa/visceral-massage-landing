import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import PublicCmsPageContent from "@/features/siteSettings/PublicCmsPageContent";
import {localizedSetting, getPublicSiteSettings} from "@/features/siteSettings/siteSettings.server";
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import type {Locale} from "@/i18n";
import PublicPageHeader from "@/components/ui/page/PublicPageHeader";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "about.meta"
    });

    return {
        title: t("title"),
        description: t("description"),
        alternates: getAlternates("/about", locale)
    };
}

export default async function AboutPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "about.page"
    });
    const settings = await getPublicSiteSettings();
    const body = localizedSetting(settings, locale, "aboutBody");

    return (
        <main id="public-page-content">
            <PublicPageHeader intro={t("subtitle")} title={t("title")} />
            <div className="container mx-auto px-4 py-8 sm:py-10">
                <PublicCmsPageContent body={body} />
            </div>
        </main>
    );
}
