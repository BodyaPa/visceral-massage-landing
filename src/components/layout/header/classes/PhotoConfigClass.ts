import {PhotoConfig} from "@/components/layout/header/classes/PhotoConfig";


export default class PhotoConfigClass implements PhotoConfig {
    src: string;

    constructor(src: string) {
        this.src = src;
    }
}