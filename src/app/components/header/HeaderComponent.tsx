import styles from "./HeaderStyles.module.scss";
import ButtonComponent from "@/app/components/button/ButtonComponent";
import ButtonConfigClass from "@/app/components/header/classes/ButtonConfigClass";
import { ButtonConfig } from "@/app/components/header/classes/ButtonConfig";
import SliderComponent from "@/app/components/slider/SliderComponent";

export default function HeaderComponent() {
    const buttonsConfig: ButtonConfig[] = [
        new ButtonConfigClass("Статті", "defaultStyle", "/articles"),
        new ButtonConfigClass("Графік",  "defaultStyle", "/calendar"),
        new ButtonConfigClass("Контакти",  "defaultStyle", "/contact"),
        new ButtonConfigClass("Про нас",  "defaultStyle", "/about"),
    ];

    return (
        <header className={styles.header}>
            <SliderComponent>
            </SliderComponent>
            <div className={styles.buttonBlock}>
                <div>
                    {buttonsConfig.map((buttonConfig, index) => (
                        <ButtonComponent key={index} text={buttonConfig.text} url={buttonConfig.url} />
                    ))}
                </div>
            </div>
            <div className={styles.userBlock}>
                <h3>Увійти | Реєстрація</h3>
            </div>
        </header>
    );
}

