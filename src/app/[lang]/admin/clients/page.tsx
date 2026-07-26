import {requireRole} from "@/features/auth/auth.server";
import ClientCrm from "@/features/clients/ClientCrm";
import type {Locale} from "@/i18n";

export default async function Page({params}: {params: Promise<{lang: string}>}) {
    const {lang} = await params;
    await requireRole("ADMIN", lang as Locale);
    return <ClientCrm />;
}
