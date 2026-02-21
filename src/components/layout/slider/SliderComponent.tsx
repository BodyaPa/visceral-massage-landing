"use client";

import styles from "./SliderStyles.module.scss";
import React, {useEffect, useMemo, useRef, useState} from "react";
import SliderButtons from "@/components/layout/slider/sliderButtons/SliderButtons";
import PhotoConfigClass from "@/components/layout/header/classes/PhotoConfigClass";

export default function SliderComponent() {
    const [activeIndex, setActiveIndex] = useState(0);

    const photoConfig = useMemo(
        () => [
            new PhotoConfigClass("/images/1.jpg"),
            new PhotoConfigClass("/images/2.jpg"),
            new PhotoConfigClass("/images/3.jpg"),
        ],
        []
    );

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveIndex((i) => (i === photoConfig.length - 1 ? 0 : i + 1));
        }, 10000);

        if (activeIndex < 0) {
            setActiveIndex(photoConfig.length - 1)
        } else {
            photoConfig.length == activeIndex ? setActiveIndex(0) : activeIndex
        }
        return () => window.clearInterval(timer);
    }, [photoConfig.length, activeIndex]);

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
        <div className={styles.content}>
            <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={false} />

            <div className={styles.stage}>
                <div ref={layerRef} className={styles.parallaxLayer}>
                    {photoConfig.map((content, index) => (
                        <img
                            key={index}
                            className={`${styles.photo} ${index === activeIndex ? styles.photoActive : ""}`}
                            src={content.src}
                            alt=""
                            draggable={false}
                            loading={index === 0 ? "eager" : "lazy"}
                        />
                    ))}
                </div>
                <div className={styles.overlay} />
            </div>

            <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={true} />
        </div>
    );
}
