import {forwardRef, type SelectHTMLAttributes} from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({className = "", children, ...props}, ref) {
    return (
        <select
            {...props}
            className={`min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-stone-400 focus:border-stone-700 focus:ring-2 focus:ring-stone-900/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-reduce:transition-none sm:text-sm ${className}`}
            ref={ref}
        >
            {children}
        </select>
    );
});

export default Select;
