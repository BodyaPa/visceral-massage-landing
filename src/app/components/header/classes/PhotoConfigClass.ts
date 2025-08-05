import {PhotoConfig} from "@/app/components/header/classes/PhotoConfig";


export default class PhotoConfigClass implements PhotoConfig {
    src: string;

    constructor(src: string) {
        this.src = src;
    }
}