"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type {ReactNode} from "react";
import Button from "@/components/ui/button/Button";

export type DropdownItem = {label: string; onSelect: () => void; disabled?: boolean; danger?: boolean};

export default function Dropdown({label, items, triggerLabel}: {label: string; triggerLabel: ReactNode; items: DropdownItem[]}) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button aria-label={label} variant="secondary">{triggerLabel}</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="ataraksia-popover-content z-[95] min-w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl outline-none" collisionPadding={12} sideOffset={8}>
                    {items.map((item) => (
                        <DropdownMenu.Item
                            className={`cursor-default rounded-lg px-3 py-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-stone-100 ${item.danger ? "text-red-700" : "text-stone-800"}`}
                            disabled={item.disabled}
                            key={item.label}
                            onSelect={item.onSelect}
                        >
                            {item.label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
