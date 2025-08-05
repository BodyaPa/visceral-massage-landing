import { ButtonConfig } from "./ButtonConfig";

export default class ButtonConfigClass implements ButtonConfig {
    text: string;
    styleName?: string;
    url?: string;

    constructor(text: string, styleName?: string, url?: string) {
        this.text = text;
        this.styleName = styleName;
        this.url = url;
    }
}