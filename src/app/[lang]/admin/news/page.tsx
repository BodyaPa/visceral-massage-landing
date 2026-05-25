import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import AdminNewsEditor from "@/features/news/AdminNewsEditor";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.news.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AdminNewsPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.news.page"});

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="max-w-2xl text-base text-stone-600">{t("subtitle")}</p>
            <AdminNewsEditor />
        </div>
    );
}
