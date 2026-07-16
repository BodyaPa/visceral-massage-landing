"use client";

import type {ReactNode} from "react";
import Button from "@/components/ui/button/Button";
import Popover from "./Popover";

export type DropdownItem = {label: string; onSelect: () => void; disabled?: boolean; danger?: boolean};
export default function Dropdown({label, items, triggerLabel}: {label: string; triggerLabel: ReactNode; items: DropdownItem[]}) {
    return <Popover align="right" label={label} role="menu" trigger={({open, toggle}) => <Button aria-expanded={open} aria-haspopup="menu" onClick={toggle} variant="secondary">{triggerLabel}</Button>}>{(close) => <>{items.map((item) => <button className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:opacity-50 ${item.danger ? "text-red-700" : "text-stone-800"}`} disabled={item.disabled} key={item.label} onClick={() => {item.onSelect();close();}} role="menuitem" type="button">{item.label}</button>)}</>}</Popover>;
}
