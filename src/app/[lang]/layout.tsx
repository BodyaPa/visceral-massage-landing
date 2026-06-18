import "../../styles/global.css";
import HeaderComponent from "@/components/layout/header/HeaderComponent";
import FooterComponent from "@/components/layout/footer/FooterComponent";
import Providers from "./providers";
import {ReactNode} from "react";
import {notFound} from "next/navigation";
import {NextIntlClientProvider} from "next-intl";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {isLocale, locales, type Locale} from "@/i18n";
import type {Metadata} from "next";
import {toLanguageTag} from '@/shared/lib/i18n/toLanguageTag';
import {getAlternates} from "@/shared/lib/seo/getAlternates";
import {ToastProvider} from "@/components/ui/toast/ToastProvider";

type Props = {
    children: ReactNode;
    params: Promise<{lang: string}>;
};

async function getLocale(params: Promise<{lang: string}>): Promise<Locale> {
    const {lang} = await params;
    if (!isLocale(lang)) notFound();
    return lang;
}

export function generateStaticParams() {
    return locales.map((lang) => ({lang}));
}

export async function generateMetadata({
                                           params
                                       }: {
    params: Promise<{lang: string}>;
}): Promise<Metadata> {
    const locale = await getLocale(params);

    const t = await getTranslations({locale, namespace: "meta"});

    return {
        metadataBase: new URL("https://example.com"), // later
        title: {
            default: "Ataraksia",
            template: `%s | Ataraksia`
        },
        description: t("description"),
        alternates: getAlternates("/", locale)
    };
}

export default async function LocaleLayout({
                                               children,
                                               params
                                           }: Props) {
    const locale = await getLocale(params);

    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <html lang={toLanguageTag(locale)}>
        <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
            <ToastProvider>
                <HeaderComponent />
                <Providers>{children}</Providers>
                <FooterComponent />
            </ToastProvider>
        </NextIntlClientProvider>
        </body>
        </html>
    );
}
