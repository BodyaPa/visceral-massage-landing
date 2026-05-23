import type {Locale} from '@/i18n';

export function withLocale(path: string, locale: Locale) {
    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    return `/${locale}${path}`;
}