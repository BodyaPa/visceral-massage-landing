"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {
    clearAutoScrollSuppression,
    prepareLocaleSwitchScrollRestore,
    restoreScrollAfterNavigation
} from "@/shared/lib/scroll/scrollManager";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {getCurrentUser, updatePreferredLocale} from "@/features/auth/auth.client";


function replaceLocaleInPath(pathname: string, newLocale: Locale) {
    const segments = pathname.split("/");

    if (segments.length > 1) {
        segments[1] = newLocale;
    }

    return segments.join("/") || `/${newLocale}`;
}

type Props = {
    requiresSession?: boolean;
    tone?: "dark" | "light";
};

export default function LanguageSwitcher({requiresSession = false, tone = "dark"}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLocale = useLocale() as Locale;
    const t = useTranslations("nav");

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

    useEffect(() => {
        let active = true;
        void getCurrentUser()
            .then((user) => {
                if (active && user && user.preferredLocale !== currentLocale) {
                    return updatePreferredLocale(currentLocale);
                }
                return undefined;
            })
            .catch(() => {
                // Session enforcement and visible errors remain owned by the account shell.
            });

        return () => {
            active = false;
        };
    }, [currentLocale]);

    function switchLocale(newLocale: Locale) {
        if (newLocale === currentLocale) return;

        const newPath = replaceLocaleInPath(pathname, newLocale);
        const query = searchParams.toString();
        const href = query ? `${newPath}?${query}` : newPath;

        setDisplayLocale(newLocale);
        prepareLocaleSwitchScrollRestore();

        timeoutRef.current = window.setTimeout(async () => {
            try {
                const user = await getCurrentUser();
                if (!user) {
                    if (requiresSession) {
                        router.replace(withLocale("/auth?mode=login", newLocale));
                        return;
                    }
                } else {
                    await updatePreferredLocale(newLocale);
                }
            } catch {
                if (requiresSession) {
                    router.replace(withLocale("/auth?mode=login", newLocale));
                    return;
                }
            }

            router.replace(href, {scroll: false});
        }, 180);
    }

    return (
        <div
            aria-label={t("language")}
            className={tone === "light"
                ? "inline-grid h-10 w-[5.75rem] shrink-0 grid-cols-2 rounded-full border border-stone-300 bg-stone-200/80 p-1 shadow-sm"
                : "inline-grid h-10 w-[5.75rem] shrink-0 grid-cols-2 rounded-full border border-white/25 bg-black/25 p-1 shadow-sm backdrop-blur-md"}
            role="group"
        >
            <button
                aria-label={t("ukrainian")}
                aria-pressed={displayLocale === "ua"}
                type="button"
                onClick={() => switchLocale("ua")}
                className={languageButtonClass(displayLocale === "ua", tone)}
            >
                UA
            </button>

            <button
                aria-label={t("english")}
                aria-pressed={displayLocale === "en"}
                type="button"
                onClick={() => switchLocale("en")}
                className={languageButtonClass(displayLocale === "en", tone)}
            >
                EN
            </button>
        </div>
    );
}

function languageButtonClass(active: boolean, tone: "dark" | "light") {
    const base = "relative grid min-h-8 place-items-center rounded-full px-2 text-xs font-bold tracking-wide outline-none transition-[background-color,color,box-shadow,transform] duration-200 hover:scale-[1.02] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none";

    if (active) {
        return `${base} bg-white text-stone-950 shadow-sm focus-visible:ring-stone-950 ${tone === "dark" ? "focus-visible:ring-offset-stone-900" : "focus-visible:ring-offset-stone-100"}`;
    }

    return tone === "light"
        ? `${base} text-stone-600 hover:bg-white/70 hover:text-stone-950 focus-visible:ring-stone-700 focus-visible:ring-offset-stone-100`
        : `${base} text-white/75 hover:bg-white/15 hover:text-white focus-visible:ring-white focus-visible:ring-offset-stone-900`;
}
