"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {useState, type ReactNode} from "react";

type PopoverProps = {
    trigger: (props: {open: boolean; toggle: () => void}) => ReactNode;
    children: ReactNode | ((close: () => void) => ReactNode);
    label: string;
    role?: "dialog" | "menu";
    align?: "left" | "right";
};

export default function Popover({trigger, children, label, role = "dialog", align = "left"}: PopoverProps) {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
                {trigger({open, toggle: () => setOpen((current) => !current)})}
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align={align === "right" ? "end" : "start"}
                    aria-label={label}
                    className="ataraksia-popover-content z-[95] min-w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl outline-none"
                    collisionPadding={12}
                    role={role}
                    sideOffset={8}
                >
                    {typeof children === "function" ? children(close) : children}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
