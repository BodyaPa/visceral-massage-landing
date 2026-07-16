"use client";

import type {ReactNode} from "react";
import Button from "@/components/ui/button/Button";
import Dialog from "./Dialog";

type ConfirmDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    children: ReactNode;
    cancelLabel: string;
    confirmLabel: string;
    closeLabel: string;
    busy?: boolean;
    destructive?: boolean;
};

export default function ConfirmDialog({open, onClose, onConfirm, title, children, cancelLabel, confirmLabel, closeLabel, busy = false, destructive = false}: ConfirmDialogProps) {
    return (
        <Dialog
            closeLabel={closeLabel}
            footer={(
                <>
                    <Button disabled={busy} onClick={onClose} variant="secondary">{cancelLabel}</Button>
                    <Button disabled={busy} onClick={onConfirm} variant={destructive ? "danger" : "primary"}>{confirmLabel}</Button>
                </>
            )}
            onClose={onClose}
            open={open}
            size="sm"
            title={title}
        >
            <div className="text-sm leading-6 text-stone-600">{children}</div>
        </Dialog>
    );
}
