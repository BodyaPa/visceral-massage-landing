import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import {hasRole} from "@/features/auth/auth.roles";
import SpecialistScheduleWorkspace from "@/features/schedule/SpecialistScheduleWorkspace";

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

export default async function AdminSchedulePage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    const user = await requireRole("SPECIALIST", locale);

    return <SpecialistScheduleWorkspace canManageAllSpecialists={hasRole(user, "MASTER")} currentUserId={user.id} />;
}
