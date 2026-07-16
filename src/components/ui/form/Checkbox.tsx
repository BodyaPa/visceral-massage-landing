import {forwardRef, type InputHTMLAttributes, type ReactNode} from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label: ReactNode;
    hint?: ReactNode;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({label, hint, className = "", id, ...props}, ref) {
    return (
        <label className={`flex min-w-0 items-start gap-3 text-sm text-stone-800 ${className}`} htmlFor={id}>
            <input {...props} className="mt-0.5 h-5 w-5 shrink-0 accent-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2" id={id} ref={ref} type="checkbox" />
            <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                {hint ? <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span> : null}
            </span>
        </label>
    );
});

export default Checkbox;
