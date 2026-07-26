import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import PublicCmsPageContent from "@/features/siteSettings/PublicCmsPageContent";
import {localizedSetting, getPublicSiteSettings} from "@/features/siteSettings/siteSettings.server";
import {getAlternates} from "@/shared/lib/seo/getAlternates";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "home.meta"
    });

    return {
        description: t("description"),
        alternates: getAlternates("/", locale)
    };
}

export default async function HomePage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;

    const t = await getTranslations({
        locale,
        namespace: "home.page"
    });
    const settings = await getPublicSiteSettings();
    const intro = localizedSetting(settings, locale, "homeIntro") ?? t("subtitle");
    const body = localizedSetting(settings, locale, "homeBody");

    return (
        <main className="flex-1 bg-stone-50" id="public-page-content">
            <section className="border-b border-stone-200 bg-white">
                <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
                    <div className="max-w-3xl space-y-5">
                        <h1 className="text-balance text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                            {t("title")}
                        </h1>
                        <p className="whitespace-pre-line text-base leading-7 text-stone-600 sm:text-lg">
                            {intro}
                        </p>
                    </div>
                </div>
            </section>
            <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <PublicCmsPageContent body={body} />
            </div>
        </main>
    );
}
