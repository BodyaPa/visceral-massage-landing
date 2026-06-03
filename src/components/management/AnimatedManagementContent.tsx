"use client";

import type {CSSProperties, ReactNode} from "react";
import {useLayoutEffect, useRef, useState} from "react";
import {usePathname} from "next/navigation";

type Props = {
    children: ReactNode;
};

type Dimensions = {
    height: number;
    width: number;
};

export default function AnimatedManagementContent({children}: Props) {
    const pathname = usePathname();
    const innerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<Dimensions | null>(null);

    useLayoutEffect(() => {
        const inner = innerRef.current;

        if (!inner) {
            return;
        }

        let frameId = 0;

        function updateDimensions() {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                if (!inner) {
                    return;
                }

                const nextDimensions = {
                    height: Math.ceil(inner.scrollHeight),
                    width: Math.ceil(inner.scrollWidth)
                };

                setDimensions((current) => {
                    if (
                        current &&
                        current.height === nextDimensions.height &&
                        current.width === nextDimensions.width
                    ) {
                        return current;
                    }

                    return nextDimensions;
                });
            });
        }

        updateDimensions();

        const observer = new ResizeObserver(updateDimensions);
        observer.observe(inner);
        window.addEventListener("resize", updateDimensions);

        return () => {
            window.cancelAnimationFrame(frameId);
            observer.disconnect();
            window.removeEventListener("resize", updateDimensions);
        };
    }, [pathname]);

    const style = dimensions
        ? ({
            "--management-content-height": `${dimensions.height}px`,
            "--management-content-width": `${dimensions.width}px`
        } as CSSProperties)
        : undefined;

    return (
        <div className="management-content min-w-0" style={style}>
            <div className="management-content-inner" ref={innerRef}>
                {children}
            </div>
        </div>
    );
}
