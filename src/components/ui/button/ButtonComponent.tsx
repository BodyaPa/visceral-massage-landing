'use client';

import Link from 'next/link';
import {useParams, usePathname} from 'next/navigation';
import styles from './ButtonStyles.module.scss';
import {withLocale} from '@/shared/lib/locale/withLocale';
import type {Locale} from '@/i18n';
import AuthenticatedLink from '@/features/auth/AuthenticatedLink';
import type {MouseEvent} from 'react';

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
    const variantClassName = styleName && styles[styleName] ? styles[styleName] : styles.defaultStyle;
    const active = href ? isActivePath(pathname, href) : false;
    const resolvedClassName = active ? `${styles.defaultStyle} ${variantClassName} ${styles.activeStyle}` : `${styles.defaultStyle} ${variantClassName}`;

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
                onClick={(event) => handleNavigationClick(event, active)}
            >
                <span key={localeKey} className={styles.labelAnimated}>
                    {text}
                </span>
            </AuthenticatedLink>
        );
    }

    return (
        <Link aria-current={active ? "page" : undefined} className={resolvedClassName} href={href} onClick={(event) => handleNavigationClick(event, active)}>
            <span key={localeKey} className={styles.labelAnimated}>
                {text}
            </span>
        </Link>
    );
}

function isActivePath(pathname: string, href: string) {
    const normalizedPathname = normalizePath(pathname);
    const normalizedHref = normalizePath(href);

    if (normalizedHref === "/ua" || normalizedHref === "/en") {
        return normalizedPathname === normalizedHref;
    }

    return normalizedPathname === normalizedHref || normalizedPathname.startsWith(`${normalizedHref}/`);
}

function normalizePath(value: string) {
    return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function handleNavigationClick(event: MouseEvent<HTMLAnchorElement>, active: boolean) {
    if (event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey) {
        return;
    }

    if (active) {
        event.preventDefault();
        scrollToPublicPageContent();
        return;
    }

    window.scrollTo({top: 0, left: 0, behavior: "auto"});
}

function scrollToPublicPageContent() {
    const content = document.getElementById("public-page-content");

    if (!content) {
        window.scrollTo({top: 0, left: 0, behavior: "smooth"});
        return;
    }

    const top = content.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({top: Math.max(top, 0), left: 0, behavior: "smooth"});
}
