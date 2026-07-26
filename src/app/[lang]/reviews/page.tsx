import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import PublicPageHeader from "@/components/ui/page/PublicPageHeader";
import PublicReviewsPage from "@/features/reviews/PublicReviewsPage";
import type {Locale} from "@/i18n";
import {getAlternates} from "@/shared/lib/seo/getAlternates";

type Props = {params: Promise<{lang: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "reviews.meta"});
    return {title: t("title"), description: t("description"), alternates: getAlternates("/reviews", locale)};
}

export default async function ReviewsPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "reviews"});
    return <main id="public-page-content"><PublicPageHeader intro={t("subtitle")} title={t("title")} /><PublicReviewsPage locale={locale} /></main>;
}
