import {forwardRef, type ButtonHTMLAttributes} from "react";
import {buttonClassName, type ButtonSize, type ButtonVariant} from "./buttonStyles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {variant = "primary", size = "md", fullWidth = false, className, type = "button", ...props},
    ref
) {
    return (
        <button
            {...props}
            className={buttonClassName({variant, size, fullWidth, className})}
            ref={ref}
            type={type}
        />
    );
});

export default Button;
