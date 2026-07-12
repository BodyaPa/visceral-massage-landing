"use client";

import {useEffect, useState, type ReactNode} from "react";
import {usePathname} from "next/navigation";

export default function AnimatedAccountContent({children}: {children: ReactNode}) {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        const frame = window.requestAnimationFrame(() => setVisible(true));
        return () => window.cancelAnimationFrame(frame);
    }, [pathname]);

    return (
        <div
            className={`min-w-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
            key={pathname}
        >
            {children}
        </div>
    );
}
