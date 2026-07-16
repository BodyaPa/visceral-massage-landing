import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import TrainingManagement from "@/features/training/TrainingManagement";

type Props = {params: Promise<{lang: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const t = await getTranslations({locale: lang as Locale, namespace: "admin.training"});
    return {title: t("title"), robots: {index: false, follow: false}};
}

export default async function AdminTrainingPage({params}: Props) {
    const {lang} = await params;
    await requireRole("ADMIN", lang as Locale);
    return <TrainingManagement />;
}
