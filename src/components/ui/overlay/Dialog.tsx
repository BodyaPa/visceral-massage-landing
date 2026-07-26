"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {useRef, type ReactNode} from "react";
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
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const close = () => {
        onClose();
        requestAnimationFrame(() => returnFocusRef.current?.isConnected && returnFocusRef.current.focus());
    };
    return (
        <DialogPrimitive.Root open={open} onOpenChange={(next) => {if (!next && dismissible) close();}}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="ataraksia-dialog-overlay fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px]" />
                <div className="pointer-events-none fixed inset-0 z-[91] flex items-end justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-6">
                    <DialogPrimitive.Content
                        className={`ataraksia-dialog-content pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl ${sizeClasses[size]}`}
                        aria-modal="true"
                        onEscapeKeyDown={(event) => {if (!dismissible) event.preventDefault();}}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
                        }}
                        onInteractOutside={(event) => {if (!dismissible) event.preventDefault();}}
                        onOpenAutoFocus={() => {returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;}}
                    >
                        <header className="flex min-w-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
                            <div className="min-w-0">
                                {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{eyebrow}</p> : null}
                                <DialogPrimitive.Title className="mt-1 break-words text-xl font-semibold text-stone-950">{title}</DialogPrimitive.Title>
                                {description ? <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</DialogPrimitive.Description> : null}
                            </div>
                            {dismissible ? <DialogPrimitive.Close asChild><Button aria-label={closeLabel} size="sm" variant="ghost">×</Button></DialogPrimitive.Close> : null}
                        </header>
                        <div className="min-w-0 px-5 py-4">{children}</div>
                        {footer ? <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer> : null}
                    </DialogPrimitive.Content>
                </div>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
