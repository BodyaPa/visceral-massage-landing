import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AdminPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.dashboard"});

    return (
        <section className="w-full max-w-4xl space-y-4 rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-sm sm:p-8">
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="max-w-2xl text-base text-stone-600">{t("subtitle")}</p>
        </section>
    );
}
