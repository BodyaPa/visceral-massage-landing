import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import {requireAnyRole} from "@/features/auth/auth.server";
import FinanceBookingsManagement from "@/features/bookings/FinanceBookingsManagement";

type Props = {
    params: Promise<{lang: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "admin.finance.meta"});

    return {
        title: t("title"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AdminFinancePage({params}: Props) {
    const {lang} = await params;
    const locale = lang as Locale;
    await requireAnyRole(["ADMIN", "FINANCE_MANAGER"], locale);

    return <FinanceBookingsManagement />;
}
