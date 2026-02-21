'use client'

import {ButtonConfig} from "@/components/layout/header/classes/ButtonConfig";
import styles from "./ButtonStyles.module.scss"
import { useRouter } from 'next/navigation'

export default function ButtonComponent({ text, styleName, url}: ButtonConfig) {
    const router = useRouter();

    function haveUrl () {
        return url != undefined ? router.push(url) : router.push("");
    }

    return (<button onClick={() => haveUrl()} className={styleName ? styles[styleName] : styles.defaultStyle}>
        {text}
    </button>
    );
}