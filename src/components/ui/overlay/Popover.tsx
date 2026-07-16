"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";

export default function Popover({trigger, children, label}: {trigger: (props: {open: boolean; toggle: () => void}) => ReactNode; children: ReactNode | ((close: () => void) => ReactNode); label: string}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent | KeyboardEvent) => {
            if (event instanceof KeyboardEvent && event.key !== "Escape") return;
            if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", close);document.addEventListener("keydown", close);
        return () => {document.removeEventListener("mousedown", close);document.removeEventListener("keydown", close);};
    }, [open]);
    return <div className="relative inline-block" ref={rootRef}>{trigger({open, toggle: () => setOpen((current) => !current)})}{open ? <div aria-label={label} className="absolute right-0 z-50 mt-2 min-w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl" role="dialog">{typeof children === "function" ? children(() => setOpen(false)) : children}</div> : null}</div>;
}
