"use client";

import {useCallback} from "react";
import {useSmartAutoScroll} from "@/shared/lib/scroll/useSmartAutoScroll";

type PublicContentAutoScrollProps = {
    targetId: string;
};

export default function PublicContentAutoScroll({targetId}: PublicContentAutoScrollProps) {
    const scrollToContent = useCallback(() => {
        const el = document.getElementById(targetId);
        if (!el) return;

        const top = el.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({top: Math.max(top, 0), behavior: "smooth"});
    }, [targetId]);

    useSmartAutoScroll({
        action: scrollToContent,
        enabled: true,
        triggerKey: targetId
    });

    return null;
}
