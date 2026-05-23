import {getRequestConfig} from 'next-intl/server';
import {defaultLocale, isLocale} from '@/i18n';

export default getRequestConfig(async ({requestLocale}) => {
    let locale = await requestLocale;

    if (!locale || !isLocale(locale)) {
        locale = defaultLocale;
    }

    return {
        locale,
        messages: (await import(`../src/messages/${locale}.json`)).default
    };
});
