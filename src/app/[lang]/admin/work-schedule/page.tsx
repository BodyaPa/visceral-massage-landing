import type {Metadata} from "next";
import type {Locale} from "@/i18n";
import {requireRole} from "@/features/auth/auth.server";
import WorkScheduleManagement from "@/features/workSchedule/WorkScheduleManagement";

export const metadata: Metadata = {robots: {index: false, follow: false}};
export default async function Page({params}: {params: Promise<{lang: string}>}) {
    const {lang} = await params;
    await requireRole("ADMIN", lang as Locale);
    return <WorkScheduleManagement />;
}
