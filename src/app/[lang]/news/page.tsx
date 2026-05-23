import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import NewsList from "./NewsList";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "news.meta"});

    return {
        title: t("title"),
        description: t("description"),
        alternates: getAlternates("/news", locale)
    };
}

export default function NewsPage() {
    return <NewsList />;
}
