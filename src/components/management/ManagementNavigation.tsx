"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import {createNavigationGroups, isActivePath, type ManagementNavigationModel} from "./managementNavigationModel";

type Props = ManagementNavigationModel;

const itemBase = "group relative flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none";
const itemDefault = `${itemBase} text-stone-600 hover:bg-stone-100 hover:text-stone-950`;
const itemActive = `${itemBase} bg-stone-950 text-white shadow-sm`;

export default function ManagementNavigation(props: Props) {
    const pathname = usePathname();
    const t = useTranslations("admin.navigation");
    const groups = useMemo(() => createNavigationGroups(props, (key) => t(key)), [props, t]);
    const activeGroupId = groups.find((group) => group.items.some((item) => isActivePath(pathname, item.href)))?.id;
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <div className="sticky top-2 z-20 self-start print:hidden lg:hidden">
                <Dialog.Root onOpenChange={setMobileOpen} open={mobileOpen}>
                    <Dialog.Trigger asChild>
                        <button className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-900" type="button">
                            <span>{t("openMenu")}</span><span aria-hidden="true">☰</span>
                        </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="management-drawer-overlay fixed inset-0 z-[95] bg-black/45 backdrop-blur-[2px] data-[state=closed]:animate-[overlay-out_180ms_ease-out] data-[state=open]:animate-[overlay-in_200ms_ease-out]" />
                        <Dialog.Content className="management-drawer-content fixed inset-y-0 left-0 z-[100] flex w-[min(88vw,22rem)] flex-col border-r border-stone-200 bg-white shadow-2xl outline-none data-[state=closed]:animate-[drawer-out_180ms_ease-out] data-[state=open]:animate-[drawer-in_200ms_ease-out]">
                            <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-4 py-3">
                                <Dialog.Title className="text-base font-semibold text-stone-950">{t("menuTitle")}</Dialog.Title>
                                <Dialog.Close asChild><button aria-label={t("closeMenu")} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-stone-600 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-900" type="button">×</button></Dialog.Close>
                            </header>
                            <nav aria-label={t("label")} className="min-h-0 flex-1 overflow-y-auto p-3">
                                <NavigationGroups activeGroupId={activeGroupId} groups={groups} onNavigate={() => setMobileOpen(false)} openGroups={openGroups} pathname={pathname} setOpenGroups={setOpenGroups} />
                            </nav>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
            <nav aria-label={t("label")} className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] max-w-full self-start overflow-y-auto rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-sm backdrop-blur print:hidden lg:block">
                <NavigationGroups activeGroupId={activeGroupId} groups={groups} openGroups={openGroups} pathname={pathname} setOpenGroups={setOpenGroups} />
            </nav>
        </>
    );
}

function NavigationGroups({groups, pathname, activeGroupId, openGroups, setOpenGroups, onNavigate}: {
    groups: ReturnType<typeof createNavigationGroups>;
    pathname: string;
    activeGroupId?: string;
    openGroups: Record<string, boolean>;
    setOpenGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onNavigate?: () => void;
}) {
    return (
        <div className="space-y-1">
            {groups.map((group) => {
                const open = group.id === activeGroupId || (openGroups[group.id] ?? false);
                return (
                    <Collapsible.Root className="w-full rounded-xl" key={group.id} onOpenChange={(next) => setOpenGroups((current) => ({...current, [group.id]: next}))} open={open}>
                        <Collapsible.Trigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-stone-600 outline-none transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-900 motion-reduce:transition-none">
                            <span>{group.label}</span>
                            <span aria-hidden="true" className="text-base transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none">⌄</span>
                        </Collapsible.Trigger>
                        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-[collapse-up_180ms_ease-out] data-[state=open]:animate-[collapse-down_200ms_ease-out] motion-reduce:animate-none">
                            <div className="space-y-1 px-1 pb-1">
                                {group.items.map((item) => {
                                    const active = isActivePath(pathname, item.href);
                                    return (
                                        <Link aria-current={active ? "page" : undefined} className={active ? itemActive : itemDefault} href={item.href} key={item.href} onClick={onNavigate}>
                                            <span className={active ? "h-1.5 w-1.5 shrink-0 rounded-full bg-white" : "h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 transition-colors group-hover:bg-stone-700"} />
                                            <span className="min-w-0 break-words">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                );
            })}
        </div>
    );
}
