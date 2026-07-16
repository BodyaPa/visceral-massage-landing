"use client";

import {useId, type ReactNode} from "react";
import OverlayPortal from "./OverlayPortal";
import useModalLayer from "./useModalLayer";
import Button from "@/components/ui/button/Button";

type DialogSize = "sm" | "md" | "lg";

const sizeClasses: Record<DialogSize, string> = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl"
};

type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    description?: ReactNode;
    eyebrow?: ReactNode;
    footer?: ReactNode;
    closeLabel: string;
    size?: DialogSize;
    dismissible?: boolean;
};

export default function Dialog({open, onClose, title, children, description, eyebrow, footer, closeLabel, size = "md", dismissible = true}: DialogProps) {
    const titleId = useId();
    const descriptionId = useId();
    const panelRef = useModalLayer(open, dismissible ? onClose : () => undefined);

    if (!open) return null;

    return (
        <OverlayPortal>
            <div
                className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 px-3 py-3 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6"
                onMouseDown={(event) => {
                    if (dismissible && event.target === event.currentTarget) onClose();
                }}
            >
                <div
                    aria-describedby={description ? descriptionId : undefined}
                    aria-labelledby={titleId}
                    aria-modal="true"
                    className={`max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-2xl outline-none motion-safe:animate-[content-enter_200ms_ease-out_both] motion-reduce:animate-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl ${sizeClasses[size]}`}
                    ref={panelRef}
                    role="dialog"
                    tabIndex={-1}
                >
                    <header className="flex min-w-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
                        <div className="min-w-0">
                            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{eyebrow}</p> : null}
                            <h2 className="mt-1 break-words text-xl font-semibold text-stone-950" id={titleId}>{title}</h2>
                            {description ? <div className="mt-2 text-sm leading-6 text-stone-600" id={descriptionId}>{description}</div> : null}
                        </div>
                        {dismissible ? <Button aria-label={closeLabel} onClick={onClose} size="sm" variant="ghost">×</Button> : null}
                    </header>
                    <div className="min-w-0 px-5 py-4">{children}</div>
                    {footer ? <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer> : null}
                </div>
            </div>
        </OverlayPortal>
    );
}
