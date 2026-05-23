"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useLocale} from "next-intl";
import type {Locale} from "@/i18n";
import styles from "./LanguageSwitcher.module.scss";
import {
    clearAutoScrollSuppression,
    prepareLocaleSwitchScrollRestore,
    restoreScrollAfterNavigation
} from "@/shared/lib/scroll/scrollManager";


function replaceLocaleInPath(pathname: string, newLocale: Locale) {
    const segments = pathname.split("/");

    if (segments.length > 1) {
        segments[1] = newLocale;
    }

    return segments.join("/") || `/${newLocale}`;
}

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLocale = useLocale() as Locale;

    const timeoutRef = useRef<number | null>(null);
    const [displayLocale, setDisplayLocale] = useState<Locale>(currentLocale);

    useEffect(() => {
        setDisplayLocale(currentLocale);
        restoreScrollAfterNavigation();

        const clearTimer = window.setTimeout(() => {
            clearAutoScrollSuppression();
        }, 250);

        return () => {
            window.clearTimeout(clearTimer);
        };
    }, [currentLocale, pathname, searchParams]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    function switchLocale(newLocale: Locale) {
        if (newLocale === currentLocale) return;

        const newPath = replaceLocaleInPath(pathname, newLocale);
        const query = searchParams.toString();
        const href = query ? `${newPath}?${query}` : newPath;

        setDisplayLocale(newLocale);
        prepareLocaleSwitchScrollRestore();

        timeoutRef.current = window.setTimeout(() => {
            router.replace(href, {scroll: false});
        }, 180);
    }

    return (
        <div className={styles.switcher}>
            <div
                className={`${styles.thumb} ${
                    displayLocale === "en" ? styles.thumbEn : styles.thumbUa
                }`}
            />

            <button
                type="button"
                onClick={() => switchLocale("ua")}
                className={`${styles.langButton} ${
                    displayLocale === "ua" ? styles.active : ""
                }`}
            >
                UA
            </button>

            <button
                type="button"
                onClick={() => switchLocale("en")}
                className={`${styles.langButton} ${
                    displayLocale === "en" ? styles.active : ""
                }`}
            >
                EN
            </button>
        </div>
    );
}