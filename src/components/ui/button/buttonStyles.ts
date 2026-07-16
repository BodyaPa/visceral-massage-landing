export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
    primary: "border-stone-900 bg-stone-900 text-white hover:border-stone-700 hover:bg-stone-700",
    secondary: "border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-100",
    ghost: "border-transparent bg-transparent text-stone-700 hover:bg-stone-100 hover:text-stone-950",
    danger: "border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800",
    link: "border-transparent bg-transparent p-0 text-stone-950 underline decoration-stone-400 underline-offset-2 hover:decoration-stone-900"
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "min-h-9 px-3 py-1.5 text-sm",
    md: "min-h-10 px-4 py-2 text-sm",
    lg: "min-h-11 px-5 py-2.5 text-base"
};

export type ButtonStyleOptions = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    className?: string;
};

export function buttonClassName({
    variant = "primary",
    size = "md",
    fullWidth = false,
    className = ""
}: ButtonStyleOptions = {}) {
    const shape = variant === "link" ? "rounded-sm" : "rounded-lg";

    return [
        "inline-flex items-center justify-center gap-2 border font-semibold outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
        shape,
        variantClasses[variant],
        variant === "link" ? "min-h-0" : sizeClasses[size],
        fullWidth ? "w-full" : "",
        className
    ].filter(Boolean).join(" ");
}
