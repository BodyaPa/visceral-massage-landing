"use client";

import { useRef } from "react";
import style from "./SliderButtons.module.scss";

type Props = {
    setPhotoIndex: (next: number) => void;
    index: number;
    plusOne: boolean;
    lockMs?: number;
};

export default function SliderButtons({ setPhotoIndex, index, plusOne, lockMs = 600 }: Props) {
    const lockedRef = useRef(false);

    const handleClick = () => {
        if (lockedRef.current) return;

        lockedRef.current = true;
        setPhotoIndex(plusOne ? index + 1 : index - 1);

        window.setTimeout(() => {
            lockedRef.current = false;
        }, lockMs);
    };

    return (
        <button
            className={`${style.button} ${plusOne ? style.right : style.left}`}
            onClick={handleClick}
        >
            {plusOne ? ">" : "<"}
        </button>
    );
}