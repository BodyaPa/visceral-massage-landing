import React from "react";
import style from './SliderButtons.module.scss'

type Props = {
    setPhotoIndex: React.Dispatch<React.SetStateAction<number>>,
    index: number,
    plusOne: boolean,
}

export default function SliderButtons({ setPhotoIndex, index, plusOne }: Props) {

    return (
        <button
            className={`${style.button} ${plusOne ? style.right : style.left}`}
            onClick={() => setPhotoIndex(plusOne ? index + 1 : index - 1)}
        >
            {plusOne ? ">" : "<"}
        </button>
    );
}