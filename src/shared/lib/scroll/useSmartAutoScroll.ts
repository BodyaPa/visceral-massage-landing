"use client";

import {useEffect} from "react";
import {shouldSuppressAutoScroll} from "@/shared/lib/scroll/scrollManager";

type UseSmartAutoScrollOptions = {
    enabled: boolean;
    triggerKey?: unknown;
    action: () => void;
};

export function useSmartAutoScroll({
                                       enabled,
                                       triggerKey,
                                       action
                                   }: UseSmartAutoScrollOptions) {
    useEffect(() => {
        if (!enabled) return;
        if (shouldSuppressAutoScroll()) return;

        let raf1 = 0;
        let raf2 = 0;

        raf1 = window.requestAnimationFrame(() => {
            raf2 = window.requestAnimationFrame(() => {
                action();
            });
        });

        return () => {
            window.cancelAnimationFrame(raf1);
            window.cancelAnimationFrame(raf2);
        };
    }, [enabled, action, triggerKey]);
}
