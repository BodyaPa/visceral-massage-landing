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
    await params;

    return (
        <div className="mx-auto w-full max-w-[min(1580px,calc(100vw-2rem))]">
            <AdminNewsEditor />
        </div>
    );
}
