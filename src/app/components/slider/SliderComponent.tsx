"use client"

import styles from "./SliderStyles.module.scss";
import {PhotoConfig} from "@/app/components/header/classes/PhotoConfig";
import PhotoConfigClass from "@/app/components/header/classes/PhotoConfigClass";
import React, {useEffect} from "react";
import SliderButtons from "@/app/components/slider/sliderButtons/SliderButtons";

export default function SliderComponent() {
    const [activeIndex, setActiveIndex] = React.useState(0);

    const photoConfig: PhotoConfig[] = [
        new PhotoConfigClass("/images/1.jpg"),
        new PhotoConfigClass("/images/2.jpg"),
        new PhotoConfigClass("/images/3.jpg"),
    ];

    useEffect( () => {
        setInterval(() => {
            setActiveIndex(activeIndex =>
                photoConfig.length - 1 === activeIndex ? 0 :
                activeIndex + 1);
        }, 10000);
    }, [])

    useEffect( () => {
       photoConfig.length == activeIndex
           ? setActiveIndex(0)
           : activeIndex
    }, [activeIndex])

    return (
        <div className={styles.content}>
            <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={false}/>
            <div>
                {photoConfig.map((content, index) => (
                    <img
                        className={`${styles.photo} ${index === activeIndex ? styles["photo-active"] : ""}`}
                        src={content.src}
                        key={index}
                        alt=""
                    />
                ))}
            </div>
            <SliderButtons setPhotoIndex={setActiveIndex} index={activeIndex} plusOne={true}/>
        </div>
    );
}

