import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import ManagementPlaceholder from "@/components/management/ManagementPlaceholder";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.specialist.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AdminSpecialistPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    await requireRole("SPECIALIST", locale);
    const t = await getTranslations({locale, namespace: "admin.specialist.page"});

    return (
        <ManagementPlaceholder
            body={t("body")}
            subtitle={t("subtitle")}
            title={t("title")}
        />
    );
}
