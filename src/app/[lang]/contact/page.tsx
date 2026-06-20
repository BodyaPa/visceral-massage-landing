import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {localizedSetting, getPublicSiteSettings} from "@/features/siteSettings/siteSettings.server";
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import type {Locale} from "@/i18n";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "contact.meta"
    });

    return {
        title: t("title"),
        description: t("description"),
        alternates: getAlternates("/contact", locale)
    };
}

export default async function ContactPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "contact.page"
    });
    const settings = await getPublicSiteSettings();
    const body = localizedSetting(settings, locale, "contactBody") ?? t("subtitle");

    return (
        <main className="container mx-auto px-4 py-10">
            <section className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="whitespace-pre-line text-base text-muted-foreground">
                    {body}
                </p>
            </section>
        </main>
    );
}
