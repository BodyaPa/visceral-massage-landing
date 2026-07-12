"use client";

import {useDeferredValue, useState} from "react";
import {useListUsersQuery} from "@/features/users/users.api";
import type {AdminUser} from "@/types/users";

type Props = {
    label: string;
    searchPlaceholder: string;
    emptyLabel: string;
    loadingLabel: string;
    clearLabel: string;
    optionalLabel?: string;
    selectedUser: AdminUser | null;
    onSelect: (user: AdminUser | null) => void;
};

export default function AdminUserPicker({
    label,
    searchPlaceholder,
    emptyLabel,
    loadingLabel,
    clearLabel,
    optionalLabel,
    selectedUser,
    onSelect
}: Props) {
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query.trim());
    const {data, isFetching} = useListUsersQuery({query: deferredQuery, enabled: true, size: 20});
    const users = data?.content ?? [];

    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-stone-800">{label}</p>
                {optionalLabel ? <span className="text-xs font-normal text-stone-500">{optionalLabel}</span> : null}
            </div>
            {selectedUser ? (
                <div className="mt-1.5 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2">
                    <span className="min-w-0">
                        <strong className="block truncate text-sm text-stone-950">{userName(selectedUser)}</strong>
                        <span className="block truncate text-xs text-stone-500">{userContact(selectedUser)}</span>
                    </span>
                    <button className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900" onClick={() => onSelect(null)} type="button">
                        {clearLabel}
                    </button>
                </div>
            ) : (
                <div className="relative mt-1.5">
                    <input
                        aria-label={label}
                        autoComplete="off"
                        className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        value={query}
                    />
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
                        {isFetching ? <p className="px-3 py-2 text-sm text-stone-500">{loadingLabel}</p> : null}
                        {!isFetching && users.length === 0 ? <p className="px-3 py-2 text-sm text-stone-500">{emptyLabel}</p> : null}
                        {users.map((user) => (
                            <button
                                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                                key={user.id}
                                onClick={() => {
                                    onSelect(user);
                                    setQuery("");
                                }}
                                type="button"
                            >
                                <span className="min-w-0">
                                    <strong className="block truncate text-sm text-stone-950">{userName(user)}</strong>
                                    <span className="block truncate text-xs text-stone-500">{userContact(user)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function userName(user: AdminUser) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "—";
}

export function userContact(user: AdminUser) {
    return user.email ?? user.phone ?? "—";
}
