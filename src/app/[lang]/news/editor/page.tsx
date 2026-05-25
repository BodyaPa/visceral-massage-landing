import {redirect} from "next/navigation";
import {requireAdmin} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{lang: string}>;
};

export default async function Page({params}: Props) {
    await requireAdmin();
    const {lang} = await params;

    redirect(withLocale("/admin/news", lang as Locale));
}
