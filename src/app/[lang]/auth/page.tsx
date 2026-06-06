import type {Metadata} from "next";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import type {Locale} from "@/i18n";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import AuthForm from "@/features/auth/AuthForm";

type Props = {
    params: Promise<{lang: string}>;
    searchParams: Promise<{mode?: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {lang} = await params;
    const locale = lang as Locale;
    const t = await getTranslations({locale, namespace: "auth"});

    return {
        title: t("metaTitle"),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default async function AuthPage({searchParams}: Props) {
    const {mode} = await searchParams;
    const initialMode = mode === "register" || mode === "recovery" ? mode : "login";

    return (
        <main className="fixed inset-0 z-[5] overflow-y-auto p-4 sm:p-6">
            <div className="fixed right-4 top-4 z-[6] rounded-full bg-stone-950/35 p-1 backdrop-blur-md sm:right-6 sm:top-6">
                <Suspense fallback={null}>
                    <LanguageSwitcher />
                </Suspense>
            </div>
            <div className="flex min-h-full w-full items-center justify-center py-14">
                <AuthForm initialMode={initialMode} />
            </div>
        </main>
    );
}
