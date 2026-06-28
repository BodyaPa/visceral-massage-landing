export function toLanguageTag(locale: string) {
    switch (locale) {
        case 'ua':
            return 'uk';
        case 'en':
            return 'en';
        default:
            return 'en';
    }
}
