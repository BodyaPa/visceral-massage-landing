"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";

type PopoverProps = {
    trigger: (props: {open: boolean; toggle: () => void}) => ReactNode;
    children: ReactNode | ((close: () => void) => ReactNode);
    label: string;
    role?: "dialog" | "menu";
    align?: "left" | "right";
};

export default function Popover({trigger, children, label, role = "dialog", align = "left"}: PopoverProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    function setOpenWithFocus(next: boolean) {
        if (next) returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(next);
        if (!next) requestAnimationFrame(() => returnFocusRef.current?.focus());
    }

    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent | KeyboardEvent) => {
            if (event instanceof KeyboardEvent && event.key !== "Escape") return;
            if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
            setOpenWithFocus(false);
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", close);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", close);
        };
    }, [open]);

    return (
        <div className="relative inline-block max-w-full" ref={rootRef}>
            {trigger({open, toggle: () => setOpenWithFocus(!open)})}
            {open ? (
                <div aria-label={label} className={`absolute z-50 mt-2 min-w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl ${align === "right" ? "right-0" : "left-0"}`} role={role}>
                    {typeof children === "function" ? children(() => setOpenWithFocus(false)) : children}
                </div>
            ) : null}
        </div>
    );
}
