import {forwardRef, type TextareaHTMLAttributes} from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({className = "", ...props}, ref) {
    return <textarea {...props} className={["min-h-28 max-h-80 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-700 focus:ring-2 focus:ring-stone-900/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 aria-invalid:border-red-500 aria-invalid:ring-red-500/15 motion-reduce:transition-none sm:text-sm", className].filter(Boolean).join(" ")} ref={ref} />;
});

export default Textarea;
