import type {ReactNode} from "react";

type FieldProps = {
    children: ReactNode;
    label: ReactNode;
    htmlFor: string;
    hint?: ReactNode;
    error?: ReactNode;
    className?: string;
};

export default function Field({children, label, htmlFor, hint, error, className = ""}: FieldProps) {
    return (
        <div className={["min-w-0 space-y-2", className].filter(Boolean).join(" ")}>
            <label className="block text-sm font-medium text-stone-800" htmlFor={htmlFor}>
                {label}
            </label>
            {children}
            {error ? <p className="text-sm text-red-700">{error}</p> : hint ? <p className="text-xs leading-5 text-stone-500">{hint}</p> : null}
        </div>
    );
}
