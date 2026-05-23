"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./HeaderStyles.module.scss";
import ButtonComponent from "@/components/ui/button/ButtonComponent";
import ButtonConfigClass from "@/components/layout/header/classes/ButtonConfigClass";
import { ButtonConfig } from "@/components/layout/header/classes/ButtonConfig";
import SliderComponent from "@/components/layout/slider/SliderComponent";
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

export default function HeaderComponent() {
    const t = useTranslations("nav");
    const locale = useLocale();

    const blockRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const placeholderRef = useRef<HTMLDivElement | null>(null);
    const [stuck, setStuck] = useState(false);

    const buttonsConfig: ButtonConfig[] = useMemo(
        () => [
            new ButtonConfigClass(t("news"), "defaultStyle", "/news"),
            new ButtonConfigClass(t("calendar"), "defaultStyle", "/calendar"),
            new ButtonConfigClass(t("contact"), "defaultStyle", "/contact"),
            new ButtonConfigClass(t("about"), "defaultStyle", "/about"),
        ],
        [t]
    );

    const syncPlaceholder = () => {
        const el = blockRef.current;
        const ph = placeholderRef.current;
        if (!el || !ph) return;
        ph.style.height = stuck ? `${el.offsetHeight}px` : "0px";
    };

    useEffect(() => {
        const onScroll = () => {
            const s = sentinelRef.current;
            if (!s) return;

            const top = s.getBoundingClientRect().top;
            setStuck(top <= 0);
        };

        onScroll();
        syncPlaceholder();

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", syncPlaceholder);

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", syncPlaceholder);
        };
    }, []);

    useEffect(() => {
        syncPlaceholder();
    }, [stuck]);

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
                                styleName={b.styleName}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.userBlock}>
                <div className={styles.userPanel}>
                    <Suspense fallback={null}>
                        <LanguageSwitcher />
                    </Suspense>
                    <h3 key={locale} className={styles.authText}>
                        {t("login")} | {t("register")}
                    </h3>
                </div>
            </div>
        </header>
    );
}
