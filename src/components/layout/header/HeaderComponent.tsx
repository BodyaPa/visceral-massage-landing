"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {usePathname} from "next/navigation";
import styles from "./HeaderStyles.module.scss";
import ButtonComponent from "@/components/ui/button/ButtonComponent";
import ButtonConfigClass from "@/components/layout/header/classes/ButtonConfigClass";
import { ButtonConfig } from "@/components/layout/header/classes/ButtonConfig";
import SliderComponent from "@/components/layout/slider/SliderComponent";
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import AuthSessionPanel from "@/features/auth/AuthSessionPanel";
import {getCurrentUser, refreshSession, type AuthenticatedUser} from "@/features/auth/auth.client";

const SESSION_KEEP_ALIVE_INTERVAL_MS = 45 * 1000;

export default function HeaderComponent() {
    const t = useTranslations("nav");
    const locale = useLocale();
    const pathname = usePathname();
    const isAuthPage = pathname.endsWith("/auth") || pathname.endsWith("/login") || pathname.endsWith("/register");
    const isAccountPage = /\/account(?:\/|$)/.test(pathname);
    const isManagementPage = pathname.includes("/admin");
    const isHomePage = /^\/(?:ua|en)\/?$/.test(pathname);

    const blockRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const placeholderRef = useRef<HTMLDivElement | null>(null);
    const [stuck, setStuck] = useState(false);
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);

    const buttonsConfig: ButtonConfig[] = useMemo(
        () => [
            new ButtonConfigClass(t("home"), "defaultStyle", "/"),
            new ButtonConfigClass(t("news"), "defaultStyle", "/news"),
            ...(user ? [
                new ButtonConfigClass(t("calendar"), "defaultStyle", "/calendar"),
                new ButtonConfigClass(t("memberships"), "defaultStyle", "/memberships")
            ] : []),
            new ButtonConfigClass(t("about"), "defaultStyle", "/about"),
            new ButtonConfigClass(t("contact"), "defaultStyle", "/contact")
        ],
        [t, user]
    );

    useEffect(() => {
        let active = true;

        getCurrentUser()
            .then((currentUser) => {
                if (active) setUser(currentUser);
            })
            .catch(() => {
                if (active) setUser(null);
            })
            .finally(() => {
                if (active) setSessionLoading(false);
            });

        return () => {
            active = false;
        };
    }, [pathname]);

    useEffect(() => {
        if (!user) {
            return;
        }

        let active = true;
        let refreshing = false;

        const keepSessionAlive = async () => {
            if (document.visibilityState !== "visible") {
                return;
            }

            if (refreshing) {
                return;
            }

            refreshing = true;

            try {
                await refreshSession();
                const currentUser = await getCurrentUser();

                if (active) {
                    setUser(currentUser);
                }
            } catch {
                if (active) {
                    setUser(null);
                }
            } finally {
                refreshing = false;
            }
        };
        const keepSessionAliveWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void keepSessionAlive();
            }
        };
        const interval = window.setInterval(keepSessionAlive, SESSION_KEEP_ALIVE_INTERVAL_MS);

        window.addEventListener("focus", keepSessionAlive);
        window.addEventListener("pageshow", keepSessionAlive);
        document.addEventListener("visibilitychange", keepSessionAliveWhenVisible);

        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", keepSessionAlive);
            window.removeEventListener("pageshow", keepSessionAlive);
            document.removeEventListener("visibilitychange", keepSessionAliveWhenVisible);
        };
    }, [user]);

    useEffect(() => {
        const onScroll = () => {
            const s = sentinelRef.current;
            if (!s) return;

            const top = s.getBoundingClientRect().top;
            setStuck(top <= 0);
        };

        onScroll();

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    useEffect(() => {
        const syncPlaceholder = () => {
            const el = blockRef.current;
            const ph = placeholderRef.current;
            if (!el || !ph) return;
            ph.style.height = stuck ? `${el.offsetHeight}px` : "0px";
        };

        syncPlaceholder();
        window.addEventListener("resize", syncPlaceholder);

        return () => {
            window.removeEventListener("resize", syncPlaceholder);
        };
    }, [stuck]);

    if (isAccountPage || isManagementPage) {
        return null;
    }

    if (!isHomePage) {
        return (
            <header className="relative z-40 border-b border-stone-800 bg-stone-950 text-white">
                <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
                    <nav aria-label={t("publicNavigation")} className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                        {buttonsConfig.map((button) => (
                            <ButtonComponent
                                key={button.url}
                                localeKey={locale}
                                styleName="stickyNavStyle"
                                text={button.text}
                                url={button.url}
                            />
                        ))}
                    </nav>
                    <div className="flex min-w-0 items-center gap-2">
                        <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession={isAuthPage} />
                        </Suspense>
                        <AuthSessionPanel key={locale} loading={sessionLoading} onLogout={() => setUser(null)} user={user} />
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className={styles.header}>
            <SliderComponent />

            <div className={styles.buttonsWrap}>
                <div ref={sentinelRef} className={styles.stickySentinel} />
                <div ref={placeholderRef} className={styles.stickyPlaceholder} />

                <div ref={blockRef} className={`${styles.buttonBlock} ${stuck ? styles.isStuck : ""}`}>
                    <div className={styles.buttonInner}>
                        {buttonsConfig.map((b) => (
                            <ButtonComponent
                                key={b.url}
                                text={b.text}
                                url={b.url}
                                localeKey={locale}
                                styleName={stuck ? "stickyNavStyle" : "heroNavStyle"}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.userBlock}>
                <div className={styles.userPanel}>
                    <Suspense fallback={null}>
                            <LanguageSwitcher requiresSession={isAccountPage || isManagementPage} />
                    </Suspense>
                    <AuthSessionPanel key={locale} user={user} loading={sessionLoading} onLogout={() => setUser(null)} />
                </div>
            </div>
        </header>
    );
}
