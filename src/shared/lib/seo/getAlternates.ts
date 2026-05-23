import type {Locale} from '@/i18n';

export function getAlternates(pathname: string, locale: Locale) {
    const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

    return {
        canonical: `/${locale}${normalized}`,
        languages: {
            uk: `/ua${normalized}`,
            en: `/en${normalized}`
        }
    };
}