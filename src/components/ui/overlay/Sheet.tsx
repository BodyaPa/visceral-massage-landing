"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {type ReactNode} from "react";
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
    return (
        <DialogPrimitive.Root open={open} onOpenChange={(next) => {if (!next) onClose();}}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="ataraksia-dialog-overlay fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px]" />
                <DialogPrimitive.Content className="ataraksia-sheet-content fixed inset-x-0 bottom-0 z-[91] flex max-h-[94dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:inset-y-0 sm:left-auto sm:max-h-none sm:max-w-lg sm:rounded-none sm:border-l sm:border-stone-200">
                    <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
                        <DialogPrimitive.Title className="text-xl font-semibold text-stone-950">{title}</DialogPrimitive.Title>
                        <DialogPrimitive.Close asChild><Button aria-label={closeLabel} size="sm" variant="ghost">×</Button></DialogPrimitive.Close>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                    {footer ? <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 px-5 py-4 sm:flex-row sm:justify-end">{footer}</footer> : null}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
