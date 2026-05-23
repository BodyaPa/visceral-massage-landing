import "../../styles/global.css";
import HeaderComponent from "@/components/layout/header/HeaderComponent";
import Providers from "./providers";
import {ReactNode} from "react";
import {notFound} from "next/navigation";
import {NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {locales} from "@/i18n";
import type {Metadata} from "next";
import {toLanguageTag} from '@/shared/lib/i18n/toLanguageTag';

export function generateStaticParams() {
    return locales.map((lang) => ({lang}));
}

export async function generateMetadata({
                                           params
                                       }: {
    params: Promise<{lang: string}>;
}): Promise<Metadata> {
    const {lang} = await params;

    const t = await getTranslations({locale: lang, namespace: "meta"});

    return {
        metadataBase: new URL("https://example.com"), // later
        title: {
            default: "Ataraksia",
            template: `%s | Ataraksia`
        },
        description: t("description"),
        alternates: {
            languages: {
                uk: '/ua',
                en: '/en'
            }
        }
    };
}

export default async function LocaleLayout({
                                               children,
                                               params
                                           }: {
    children: ReactNode;
    params: Promise<{lang: string}>;
}) {
    const {lang} = await params;
    if (!locales.includes(lang as any)) notFound();

    setRequestLocale(lang);
    const messages = await getMessages();

    return (
        <html lang={toLanguageTag(lang as any)}>
        <body>
        <NextIntlClientProvider locale={lang} messages={messages}>
            <HeaderComponent />
            <Providers>{children}</Providers>
            {/* <FooterComponent /> */}
        </NextIntlClientProvider>
        </body>
        </html>
    );
}

