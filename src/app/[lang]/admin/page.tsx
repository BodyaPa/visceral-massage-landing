import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {redirect} from "next/navigation";
import {requireAnyRole} from "@/features/auth/auth.server";
import {hasRole} from "@/features/auth/auth.roles";
import {withLocale} from "@/shared/lib/locale/withLocale";

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
    const user = await requireAnyRole(["SMM", "MASTER", "SPECIALIST", "FINANCE_MANAGER"], locale);

    if (hasRole(user, "SMM")) {
        redirect(withLocale("/admin/news", locale));
    }

    if (hasRole(user, "MASTER")) {
        redirect(withLocale("/admin/users", locale));
    }

    if (hasRole(user, "SPECIALIST")) {
        redirect(withLocale("/admin/specialist", locale));
    }

    if (hasRole(user, "FINANCE_MANAGER")) {
        redirect(withLocale("/admin/finance", locale));
    }

    redirect(withLocale("/account", locale));
}
