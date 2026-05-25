import {redirect} from "next/navigation";
import type {Locale} from "@/i18n";
import {withLocale} from "@/shared/lib/locale/withLocale";

type Props = {
    params: Promise<{lang: string}>;
};

export default async function LoginPage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    redirect(withLocale("/auth?mode=login", locale));
}
