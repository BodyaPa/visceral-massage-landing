"use client";

import {useEffect, useRef} from "react";

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
].join(",");

export default function useModalLayer(open: boolean, onClose: () => void) {
    const panelRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;

        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const panel = panelRef.current;
        if (!panel) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
            .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
        const initial = focusable()[0] ?? panel;
        requestAnimationFrame(() => initial.focus());

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab") return;

            const elements = focusable();
            if (elements.length === 0) {
                event.preventDefault();
                panel?.focus();
                return;
            }
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            requestAnimationFrame(() => returnFocusRef.current?.focus());
        };
    }, [open]);

    return panelRef;
}
