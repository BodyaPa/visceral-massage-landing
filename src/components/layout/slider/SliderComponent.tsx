"use client";

import styles from "./SliderStyles.module.scss";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {usePathname} from "next/navigation";
import SliderButtons from "@/components/layout/slider/sliderButtons/SliderButtons";
import {API_URL} from "@/shared/constants/env";
import {SITE_SLIDER_UPDATED_EVENT} from "@/features/siteSettings/siteSettingsMedia";
import type {MediaAsset} from "@/types/news";

type Props = {
    background?: boolean;
};

type Slide = {
    src: string;
    alt: string;
};

export default function SliderComponent({background = false}: Props) {
    const pathname = usePathname();
    const [activeIndex, setActiveIndex] = useState(0);
    const [managedSlides, setManagedSlides] = useState<Slide[]>([]);

    const fallbackSlides = useMemo<Slide[]>(
        () => [
            {src: "/images/1.jpg", alt: ""},
            {src: "/images/2.jpg", alt: ""},
            {src: "/images/3.jpg", alt: ""}
        ],
        []
    );
    const slides = managedSlides.length > 0 ? managedSlides : fallbackSlides;

    useEffect(() => {
        let active = true;

        const loadSlides = () => {
            fetch(`${API_URL}/api/site-settings/media`, {cache: "no-store"})
                .then((response) => response.ok ? response.json() as Promise<MediaAsset[]> : [])
                .then((assets) => {
                    if (!active) return;
                    setManagedSlides(
                        assets
                            .filter((asset) => asset.contentType.startsWith("image/"))
                            .map((asset) => ({
                                src: `${API_URL}/api/site-settings/media/${asset.id}/content`,
                                alt: asset.originalFilename
                            }))
                    );
                })
                .catch(() => {
                    if (active) setManagedSlides([]);
                });
        };
        const loadWhenVisible = () => {
            if (document.visibilityState === "visible") {
                loadSlides();
            }
        };

        loadSlides();
        window.addEventListener(SITE_SLIDER_UPDATED_EVENT, loadSlides);
        window.addEventListener("focus", loadSlides);
        window.addEventListener("pageshow", loadSlides);
        document.addEventListener("visibilitychange", loadWhenVisible);

        return () => {
            active = false;
            window.removeEventListener(SITE_SLIDER_UPDATED_EVENT, loadSlides);
            window.removeEventListener("focus", loadSlides);
            window.removeEventListener("pageshow", loadSlides);
            document.removeEventListener("visibilitychange", loadWhenVisible);
        };
    }, [pathname]);

    useEffect(() => {
        if (activeIndex < 0) {
            setActiveIndex(slides.length - 1);
        } else if (activeIndex >= slides.length) {
            setActiveIndex(0);
        }
    }, [activeIndex, slides.length]);

    useEffect(() => {
        if (slides.length <= 1) {
            return;
        }

        const timer = window.setInterval(() => {
            setActiveIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
        }, 10000);

        return () => window.clearInterval(timer);
    }, [slides.length]);

    const layerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const speed = 0.5;

        const onScroll = () => {
            if (!layerRef.current) return;
            const py = window.scrollY * speed;
            layerRef.current.style.setProperty("--py", `${py}px`);
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className={`${styles.content} ${background ? styles.background : ""}`}>
            {background ? null : <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={false} />}

            <div className={styles.stage}>
                <div ref={layerRef} className={styles.parallaxLayer}>
                    {slides.map((content, index) => (
                        // eslint-disable-next-line @next/next/no-img-element -- slider images may come from the public API media endpoint.
                        <img
                            key={index}
                            className={`${styles.photo} ${index === activeIndex ? styles.photoActive : ""}`}
                            src={content.src}
                            alt={content.alt}
                            draggable={false}
                            loading={index === 0 ? "eager" : "lazy"}
                        />
                    ))}
                </div>
                <div className={styles.overlay} />
            </div>

            {background ? null : <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={true} />}
        </div>
    );
}
