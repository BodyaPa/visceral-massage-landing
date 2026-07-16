"use client";

import {useRef} from "react";

export type TabOption<T extends string> = {value: T; label: string; disabled?: boolean};

export default function Tabs<T extends string>({options, value, onChange, label}: {options: TabOption<T>[]; value: T; onChange: (value: T) => void; label: string}) {
    const refs = useRef<Array<HTMLButtonElement | null>>([]);
    function move(index: number, direction: number) {
        let next = index;
        do next = (next + direction + options.length) % options.length;
        while (options[next]?.disabled && next !== index);
        const option = options[next];
        if (option && !option.disabled) {onChange(option.value);refs.current[next]?.focus();}
    }
    return (
        <div aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-stone-100 p-1" role="tablist">
            {options.map((option, index) => <button aria-selected={option.value === value} className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${option.value === value ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} disabled={option.disabled} key={option.value} onClick={() => onChange(option.value)} onKeyDown={(event) => {if (event.key === "ArrowRight") move(index, 1);if (event.key === "ArrowLeft") move(index, -1);}} ref={(node) => {refs.current[index] = node;}} role="tab" tabIndex={option.value === value ? 0 : -1} type="button">{option.label}</button>)}
        </div>
    );
}
