"use client";

import {useEffect, useId, useMemo, useRef, useState} from "react";

export type ComboboxOption = {value: string; label: string; description?: string};

type ComboboxProps = {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder: string;
    emptyLabel: string;
    disabled?: boolean;
};

export default function Combobox({options, value, onChange, label, placeholder, emptyLabel, disabled = false}: ComboboxProps) {
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const selected = options.find((option) => option.value === value);
    const [query, setQuery] = useState(selected?.label ?? "");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const filtered = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase();
        return normalized ? options.filter((option) => `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(normalized)) : options;
    }, [options, query]);

    useEffect(() => {
        if (!open) setQuery(selected?.label ?? "");
    }, [open, selected?.label]);

    function choose(option: ComboboxOption) {
        onChange(option.value);
        setQuery(option.label);
        setOpen(false);
        inputRef.current?.focus();
    }

    return (
        <div className="relative min-w-0">
            <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor={`${listId}-input`}>{label}</label>
            <input
                aria-activedescendant={open && filtered[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={open}
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none hover:border-stone-400 focus:border-stone-700 focus:ring-2 focus:ring-stone-900/15"
                disabled={disabled}
                id={`${listId}-input`}
                onBlur={() => window.setTimeout(() => setOpen(false), 100)}
                onChange={(event) => {setQuery(event.target.value);setOpen(true);setActiveIndex(0);}}
                onFocus={() => setOpen(true)}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {event.preventDefault();setOpen(true);setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));}
                    if (event.key === "ArrowUp") {event.preventDefault();setOpen(true);setActiveIndex((index) => Math.max(index - 1, 0));}
                    if (event.key === "Home" && open) {event.preventDefault();setActiveIndex(0);}
                    if (event.key === "End" && open) {event.preventDefault();setActiveIndex(Math.max(filtered.length - 1, 0));}
                    if (event.key === "Enter" && open && filtered[activeIndex]) {event.preventDefault();choose(filtered[activeIndex]);}
                    if (event.key === "Escape") setOpen(false);
                }}
                placeholder={placeholder}
                ref={inputRef}
                role="combobox"
                value={query}
            />
            {open ? (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl" id={listId} role="listbox">
                    {filtered.length ? filtered.map((option, index) => (
                        <button aria-selected={option.value === value} className={`block w-full rounded-lg px-3 py-2 text-left text-sm outline-none ${index === activeIndex ? "bg-stone-100" : "hover:bg-stone-50"}`} id={`${listId}-option-${index}`} key={option.value} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)} role="option" tabIndex={-1} type="button">
                            <span className="block font-medium text-stone-900">{option.label}</span>
                            {option.description ? <span className="mt-0.5 block text-xs text-stone-500">{option.description}</span> : null}
                        </button>
                    )) : <p className="px-3 py-4 text-center text-sm text-stone-500">{emptyLabel}</p>}
                </div>
            ) : null}
        </div>
    );
}
