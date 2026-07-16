"use client";

import {useId, type ReactNode} from "react";
import OverlayPortal from "./OverlayPortal";
import useModalLayer from "./useModalLayer";
import Button from "@/components/ui/button/Button";

type SheetProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    closeLabel: string;
    footer?: ReactNode;
};

export default function Sheet({open, onClose, title, children, closeLabel, footer}: SheetProps) {
    const titleId = useId();
    const panelRef = useModalLayer(open, onClose);
    if (!open) return null;

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[90] flex items-end justify-end bg-black/45 backdrop-blur-[2px]" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
                <aside aria-labelledby={titleId} aria-modal="true" className="flex max-h-[94dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none transition-transform duration-200 motion-reduce:transition-none sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-stone-200" ref={panelRef} role="dialog" tabIndex={-1}>
                    <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
                        <h2 className="text-xl font-semibold text-stone-950" id={titleId}>{title}</h2>
                        <Button aria-label={closeLabel} onClick={onClose} size="sm" variant="ghost">×</Button>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                    {footer ? <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer> : null}
                </aside>
            </div>
        </OverlayPortal>
    );
}
