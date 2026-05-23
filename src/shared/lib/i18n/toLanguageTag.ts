import type {Locale} from '@/i18n';

export function toLanguageTag(locale: Locale) {
    switch (locale) {
        case 'ua':
            return 'uk';
        case 'en':
            return 'en';
        default:
            return 'en';
    }
}