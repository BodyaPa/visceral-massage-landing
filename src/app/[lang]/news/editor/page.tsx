import {redirect} from "next/navigation";
import {requireRole} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{lang: string}>;
};

export default async function Page({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    await requireRole("SMM", locale);

    redirect(withLocale("/admin/news", locale));
}
