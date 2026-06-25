'use client';

import Link from 'next/link';
import {useParams, usePathname} from 'next/navigation';
import styles from './ButtonStyles.module.scss';
import {withLocale} from '@/shared/lib/locale/withLocale';
import type {Locale} from '@/i18n';
import AuthenticatedLink from '@/features/auth/AuthenticatedLink';

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

function isProtectedInternalPath(url: string | undefined) {
    if (!url) return false;

    return url === "/account"
        || url === "/calendar"
        || url === "/memberships"
        || url === "/admin"
        || url.startsWith("/admin/");
}

export default function ButtonComponent({
                                            text,
                                            styleName,
                                            url,
                                            localeKey
                                        }: ButtonProps) {
    const params = useParams();
    const pathname = usePathname();
    const lang = params.lang as Locale;

    const href = resolveHref(url, lang);
    const className = styleName ? styles[styleName] : styles.defaultStyle;
    const active = href ? isActivePath(pathname, href) : false;
    const resolvedClassName = active ? `${className} ${styles.activeStyle}` : className;

    if (!href) {
        return (
            <button type="button" className={resolvedClassName}>
                <span key={localeKey} className={styles.labelAnimated}>
                    {text}
                </span>
            </button>
        );
    }

    if (isProtectedInternalPath(url)) {
        return (
            <AuthenticatedLink
                aria-current={active ? "page" : undefined}
                className={resolvedClassName}
                fallbackHref={withLocale("/auth?mode=login", lang)}
                href={href}
            >
                <span key={localeKey} className={styles.labelAnimated}>
                    {text}
                </span>
            </AuthenticatedLink>
        );
    }

    return (
        <Link aria-current={active ? "page" : undefined} className={resolvedClassName} href={href}>
            <span key={localeKey} className={styles.labelAnimated}>
                {text}
            </span>
        </Link>
    );
}

function isActivePath(pathname: string, href: string) {
    if (href === "/" || href.endsWith("/ua") || href.endsWith("/en")) {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}
