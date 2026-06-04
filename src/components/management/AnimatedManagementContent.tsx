"use client";

import type {ReactNode} from "react";
import {usePathname} from "next/navigation";

type Props = {
    children: ReactNode;
};

export default function AnimatedManagementContent({children}: Props) {
    const pathname = usePathname();

    return (
        <div className="management-content min-w-0">
            <div className="management-content-inner" key={pathname}>
                {children}
            </div>
        </div>
    );
}
