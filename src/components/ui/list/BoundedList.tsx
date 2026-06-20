"use client";

import {useEffect, useState, type ReactNode} from "react";

type BoundedListLabels = {
    showLess: string;
    showMore: string;
    showing: (visible: number, total: number) => string;
};

type BoundedListProps<T> = {
    controlsClassName?: string;
    empty?: ReactNode;
    initialCount?: number;
    items: T[];
    labels: BoundedListLabels;
    renderItems: (items: T[]) => ReactNode;
    step?: number;
};

export default function BoundedList<T>({
    controlsClassName = "mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2",
    empty = null,
    initialCount = 20,
    items,
    labels,
    renderItems,
    step = initialCount
}: BoundedListProps<T>) {
    const [limit, setLimit] = useState(initialCount);

    useEffect(() => {
        setLimit(initialCount);
    }, [initialCount, items]);

    if (items.length === 0) return <>{empty}</>;

    const visibleCount = Math.min(limit, items.length);
    const visibleItems = items.slice(0, visibleCount);
    const hasOverflow = items.length > initialCount;

    return (
        <>
            {renderItems(visibleItems)}
            {hasOverflow ? (
                <div className={controlsClassName}>
                    <span className="min-w-0 break-words text-xs text-stone-500">{labels.showing(visibleCount, items.length)}</span>
                    {visibleCount < items.length ? (
                        <button className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100" onClick={() => setLimit((current) => Math.min(current + step, items.length))} type="button">
                            {labels.showMore}
                        </button>
                    ) : (
                        <button className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100" onClick={() => setLimit(initialCount)} type="button">
                            {labels.showLess}
                        </button>
                    )}
                </div>
            ) : null}
        </>
    );
}
