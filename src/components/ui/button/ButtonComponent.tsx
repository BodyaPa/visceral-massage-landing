'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import styles from './ButtonStyles.module.scss';
import {withLocale} from '@/shared/lib/locale/withLocale';
import type {Locale} from '@/i18n';

type ButtonProps = {
    text: string;
    url?: string;
    styleName?: string;
    localeKey: string;
};

function resolveHref(url: string | undefined, lang: Locale) {
    if (!url || !url.trim()) return null;

    if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#')
    ) {
        return url;
    }

    return withLocale(url, lang);
}

export default function ButtonComponent({
                                            text,
                                            styleName,
                                            url,
                                            localeKey
                                        }: ButtonProps) {
    const params = useParams();
    const lang = params.lang as Locale;

    const href = resolveHref(url, lang);
    const className = styleName ? styles[styleName] : styles.defaultStyle;

    if (!href) {
        return (
            <button type="button" className={className}>
                <span key={localeKey} className={styles.labelAnimated}>
                    {text}
                </span>
            </button>
        );
    }

    return (
        <Link className={className} href={href}>
            <span key={localeKey} className={styles.labelAnimated}>
                {text}
            </span>
        </Link>
    );
}