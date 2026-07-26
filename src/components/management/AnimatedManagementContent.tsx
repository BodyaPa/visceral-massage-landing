"use client";

import type {ReactNode} from "react";
import {usePathname} from "next/navigation";

type Props = {
    children: ReactNode;
};

export default function AnimatedManagementContent({children}: Props) {
    const pathname = usePathname();

    return (
        <div className="management-content w-full min-w-0 max-w-none">
            <div className="management-content-inner w-full min-w-0 max-w-none" key={pathname}>
                {children}
            </div>
        </div>
    );
}
