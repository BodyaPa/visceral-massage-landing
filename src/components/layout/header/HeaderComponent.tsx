"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HeaderStyles.module.scss";
import ButtonComponent from "@/components/ui/button/ButtonComponent";
import ButtonConfigClass from "@/components/layout/header/classes/ButtonConfigClass";
import { ButtonConfig } from "@/components/layout/header/classes/ButtonConfig";
import SliderComponent from "@/components/layout/slider/SliderComponent";

export default function HeaderComponent() {
    const blockRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const placeholderRef = useRef<HTMLDivElement | null>(null);
    const [stuck, setStuck] = useState(false);
    const buttonsConfig: ButtonConfig[] = useMemo(
        () => [
            new ButtonConfigClass("Статті", "defaultStyle", "/articles"),
            new ButtonConfigClass("Графік", "defaultStyle", "/calendar"),
            new ButtonConfigClass("Контакти", "defaultStyle", "/contact"),
            new ButtonConfigClass("Про нас", "defaultStyle", "/about"),
        ],
        []
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
                        {buttonsConfig.map((b, i) => (
                            <ButtonComponent key={i} text={b.text} url={b.url} />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.userBlock}>
                <h3>Увійти | Реєстрація</h3>
            </div>
        </header>
    );
}