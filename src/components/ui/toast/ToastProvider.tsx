"use client";

import {createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useTranslations} from "next-intl";

type ToastVariant = "success" | "error";

type Toast = {
    id: number;
    message: string;
    variant: ToastVariant;
};

type ToastContextValue = {
    success: (message: string) => void;
    error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({children}: {children: ReactNode}) {
    const t = useTranslations("toast");
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    const timers = useRef(new Map<number, number>());

    const dismiss = useCallback((id: number) => {
        const timer = timers.current.get(id);
        if (timer !== undefined) {
            window.clearTimeout(timer);
            timers.current.delete(id);
        }
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show = useCallback((variant: ToastVariant, message: string) => {
        const id = ++nextId.current;
        setToasts((current) => [...current, {id, message, variant}]);
        timers.current.set(id, window.setTimeout(() => dismiss(id), 4500));
    }, [dismiss]);

    useEffect(() => {
        const activeTimers = timers.current;
        return () => {
            activeTimers.forEach((timer) => window.clearTimeout(timer));
            activeTimers.clear();
        };
    }, []);

    const value = useMemo<ToastContextValue>(() => ({
        success: (message) => show("success", message),
        error: (message) => show("error", message)
    }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="false"
                className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4"
            >
                {toasts.map((toast) => (
                    <div
                        className={`pointer-events-auto relative w-full max-w-md rounded-xl border px-4 py-3 pr-12 shadow-xl backdrop-blur-sm ${
                            toast.variant === "success"
                                ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
                                : "border-red-200 bg-red-50/95 text-red-900"
                        }`}
                        key={toast.id}
                        role={toast.variant === "error" ? "alert" : "status"}
                    >
                        <p className="text-sm font-medium leading-5">
                            {toast.message}
                        </p>

                        <button
                            aria-label={t("dismiss")}
                            className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent text-base leading-none opacity-60 transition hover:bg-black/5 hover:opacity-100"
                            onClick={() => dismiss(toast.id)}
                            type="button"
                        >
                            <span className="-mt-px">&times;</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used inside ToastProvider.");
    }

    return context;
}
