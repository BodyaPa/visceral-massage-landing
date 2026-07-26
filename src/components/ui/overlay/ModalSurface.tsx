"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {useRef, type ReactNode} from "react";

type ModalSurfaceProps = {
    children: ReactNode;
    label: string;
    onClose: () => void;
    className?: string;
    dismissible?: boolean;
};

export default function ModalSurface({children, label, onClose, className = "", dismissible = true}: ModalSurfaceProps) {
    const returnFocusRef = useRef<HTMLElement | null>(
        typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    const close = () => {
        onClose();
        requestAnimationFrame(() => returnFocusRef.current?.isConnected && returnFocusRef.current.focus());
    };
    return (
        <DialogPrimitive.Root defaultOpen onOpenChange={(open) => {if (!open && dismissible) close();}}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="ataraksia-dialog-overlay fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px]" />
                <div className="pointer-events-none fixed inset-0 z-[91] flex items-end justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-6">
                    <DialogPrimitive.Content
                        className={`ataraksia-dialog-content pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl ${className}`}
                        aria-modal="true"
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
                        }}
                        onEscapeKeyDown={(event) => {if (!dismissible) event.preventDefault();}}
                        onInteractOutside={(event) => {if (!dismissible) event.preventDefault();}}
                    >
                        <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
                        {children}
                    </DialogPrimitive.Content>
                </div>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
