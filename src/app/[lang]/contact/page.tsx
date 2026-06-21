import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import PublicContentAutoScroll from "@/components/common/PublicContentAutoScroll";
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
    const details = [
        {title: t("detail1Title"), body: t("detail1Body")},
        {title: t("detail2Title"), body: t("detail2Body")},
        {title: t("detail3Title"), body: t("detail3Body")}
    ];

    return (
        <main className="container mx-auto px-4 py-10" id="public-page-content">
            <PublicContentAutoScroll targetId="public-page-content" />
            <section className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="whitespace-pre-line text-base text-muted-foreground">
                    {body}
                </p>
            </section>
            <section className="mt-8 grid max-w-5xl gap-3 md:grid-cols-3">
                {details.map((item) => (
                    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" key={item.title}>
                        <h2 className="text-base font-semibold text-stone-950">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                    </article>
                ))}
            </section>
        </main>
    );
}
