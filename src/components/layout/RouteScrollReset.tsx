"use client";

import {Suspense, useEffect} from "react";
import {usePathname, useSearchParams} from "next/navigation";
import {shouldSuppressAutoScroll} from "@/shared/lib/scroll/scrollManager";

export default function RouteScrollReset() {
    return (
        <Suspense fallback={null}>
            <RouteScrollResetInner />
        </Suspense>
    );
}

function RouteScrollResetInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.toString();

    useEffect(() => {
        if (shouldSuppressAutoScroll()) return;

        let raf1 = 0;
        let raf2 = 0;

        raf1 = window.requestAnimationFrame(() => {
            raf2 = window.requestAnimationFrame(() => {
                scrollToRouteTarget();
            });
        });

        return () => {
            window.cancelAnimationFrame(raf1);
            window.cancelAnimationFrame(raf2);
        };
    }, [pathname, search]);

    return null;
}

function scrollToRouteTarget() {
    const target = document.querySelector<HTMLElement>("[data-route-scroll-target]")
        ?? document.getElementById("public-page-content");

    if (!target) {
        window.scrollTo({top: 0, left: 0, behavior: "smooth"});
        return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({top: Math.max(top, 0), left: 0, behavior: "smooth"});
}
