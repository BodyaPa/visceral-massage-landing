"use client";

import {useEffect, useMemo, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import type {UserRole} from "@/features/auth/auth.roles";
import {useListUsersQuery, useUpdateUserEnabledMutation, useUpdateUserRolesMutation} from "@/features/users/users.api";
import type {AdminUser} from "@/types/users";

const manageableRoles: UserRole[] = ["MASTER", "SPECIALIST", "FINANCE_MANAGER", "SMM"];
const allFilterRoles: UserRole[] = ["USER", ...manageableRoles];
const emptyUsers: AdminUser[] = [];

export default function UsersManagement({currentUserId}: {currentUserId: number}) {
    const t = useTranslations("admin.users");
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<UserRole | "">("");
    const [enabled, setEnabled] = useState<boolean | "">("");
    const {data, isFetching, isError} = useListUsersQuery({query, role, enabled});
    const users = data?.content ?? emptyUsers;
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const selectedUser = selectedUserId === null ? null : users.find((user) => user.id === selectedUserId) ?? null;
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [pendingStatusUser, setPendingStatusUser] = useState<AdminUser | null>(null);
    const [updateRoles, {isLoading: isSaving}] = useUpdateUserRolesMutation();
    const [updateEnabled, {isLoading: isStatusSaving}] = useUpdateUserEnabledMutation();

    useEffect(() => {
        if (users.length === 0) {
            setSelectedUserId(null);
            setSelectedRoles([]);
            return;
        }

        if (selectedUserId === null || !users.some((user) => user.id === selectedUserId)) {
            setSelectedUserId(users[0].id);
            setSelectedRoles(users[0].roles);
        }
    }, [selectedUserId, users]);

    const hasRole = useMemo(() => new Set(selectedRoles), [selectedRoles]);

    function toggleRole(roleName: UserRole) {
        setSelectedRoles((current) => {
            const next = new Set(current);
            if (next.has(roleName)) {
                next.delete(roleName);
            } else {
                next.add(roleName);
            }
            next.add("USER");
            return allFilterRoles.filter((item) => next.has(item));
        });
    }

    async function saveRoles() {
        if (!selectedUser) return;

        try {
            await updateRoles({id: selectedUser.id, roles: selectedRoles}).unwrap();
            toast.success(t("saveSuccess"));
        } catch {
            toast.error(t("saveError"));
        }
    }

    async function confirmStatusChange() {
        if (!pendingStatusUser) return;

        try {
            await updateEnabled({id: pendingStatusUser.id, enabled: !pendingStatusUser.enabled}).unwrap();
            toast.success(pendingStatusUser.enabled ? t("disableSuccess") : t("restoreSuccess"));
            setPendingStatusUser(null);
        } catch {
            toast.error(pendingStatusUser.enabled ? t("disableError") : t("restoreError"));
        }
    }

    return (
        <section className="grid w-full min-w-0 max-w-full items-start gap-5 xl:grid-cols-[minmax(420px,580px)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 break-words text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <span className="w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                            {users.length}
                        </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
                        <input
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t("search")}
                            value={query}
                        />
                        <select
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => setRole(event.target.value as UserRole | "")}
                            value={role}
                        >
                            <option value="">{t("allRoles")}</option>
                            {allFilterRoles.map((roleName) => (
                                <option key={roleName} value={roleName}>{t(`roles.${roleName}`)}</option>
                            ))}
                        </select>
                        <select
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => {
                                const value = event.target.value;
                                setEnabled(value === "" ? "" : value === "true");
                            }}
                            value={enabled === "" ? "" : String(enabled)}
                        >
                            <option value="">{t("allStatuses")}</option>
                            <option value="true">{t("enabled")}</option>
                            <option value="false">{t("disabled")}</option>
                        </select>
                    </div>
                </div>

                {isError ? <p className="text-sm text-red-700">{t("loadError")}</p> : null}
                {isFetching ? <p className="text-sm text-stone-500">{t("loading")}</p> : null}

                <div className="max-h-[36rem] overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70 p-2">
                    <div className="space-y-2" role="list">
                        {users.map((user) => {
                            const active = user.id === selectedUser?.id;
                            const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("unnamed");

                            return (
                                <button
                                    aria-pressed={active}
                                    className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                                        active
                                            ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                                            : "border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50"
                                    }`}
                                    key={user.id}
                                    onClick={() => {
                                        setSelectedUserId(user.id);
                                        setSelectedRoles(user.roles);
                                    }}
                                    type="button"
                                >
                                    <span className="flex min-w-0 flex-col gap-2">
                                        <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                            <span className="min-w-0">
                                                <span className="block break-words text-sm font-semibold">{name}</span>
                                                <span className={`mt-1 block break-words text-xs ${active ? "text-stone-200" : "text-stone-600"}`}>
                                                    {user.email ?? user.phone ?? t("noContact")}
                                                </span>
                                            </span>
                                            <StatusBadge active={active} enabled={user.enabled} label={user.enabled ? t("enabled") : t("disabled")} />
                                        </span>
                                        <span className="flex flex-wrap gap-1.5">
                                            {user.roles.map((roleName) => (
                                                <RoleBadge active={active} key={roleName} label={t(`roles.${roleName}`)} />
                                            ))}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        {!isFetching && users.length === 0 ? <p className="p-3 text-sm text-stone-500">{t("empty")}</p> : null}
                    </div>
                </div>
            </div>

            <div className="min-w-0 max-w-full rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:max-w-3xl sm:p-5">
                {selectedUser ? (
                    <div className="space-y-5">
                        <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("profile")}</p>
                                <h2 className="mt-1 break-words text-2xl font-semibold text-stone-950">
                                    {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || t("unnamed")}
                                </h2>
                                <p className="mt-1 break-words text-sm text-stone-600">
                                    {selectedUser.email ?? selectedUser.phone ?? t("noContact")}
                                </p>
                            </div>
                            <StatusBadge enabled={selectedUser.enabled} label={selectedUser.enabled ? t("enabled") : t("disabled")} />
                        </div>

                        <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                            <Info label={t("phone")} value={selectedUser.phone ?? t("emptyValue")} />
                            <Info label={t("email")} value={selectedUser.email ?? t("emptyValue")} />
                            <Info label={t("status")} value={selectedUser.enabled ? t("enabled") : t("disabled")} />
                            <Info label={t("createdAt")} value={new Date(selectedUser.createdAt).toLocaleString()} />
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                            <p className="text-sm font-semibold text-amber-950">{t("accessTitle")}</p>
                            <p className="mt-1 text-xs leading-5 text-amber-900">{t("accessBody")}</p>
                            <button
                                className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 sm:w-fit ${
                                    selectedUser.enabled
                                        ? "bg-red-700 text-white hover:bg-red-600"
                                        : "bg-stone-900 text-white hover:bg-stone-700"
                                }`}
                                disabled={selectedUser.id === currentUserId || isStatusSaving}
                                onClick={() => setPendingStatusUser(selectedUser)}
                                type="button"
                            >
                                {selectedUser.enabled ? t("disableUser") : t("restoreUser")}
                            </button>
                            {selectedUser.id === currentUserId ? <p className="mt-2 text-xs text-amber-900">{t("selfDisableBlocked")}</p> : null}
                        </div>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold text-stone-900">{t("assignedRoles")}</legend>
                            <label className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                                <span className="min-w-0 break-words">{t("roles.USER")}</span>
                                <input checked disabled readOnly type="checkbox" />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {manageableRoles.map((roleName) => (
                                    <label
                                        className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            hasRole.has(roleName)
                                                ? "border-stone-400 bg-stone-100 text-stone-950"
                                                : "border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
                                        }`}
                                        key={roleName}
                                    >
                                        <span className="min-w-0 break-words">{t(`roles.${roleName}`)}</span>
                                        <input
                                            checked={hasRole.has(roleName)}
                                            onChange={() => toggleRole(roleName)}
                                            type="checkbox"
                                        />
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <button
                            className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-fit"
                            disabled={isSaving}
                            onClick={saveRoles}
                            type="button"
                        >
                            {isSaving ? t("saving") : t("save")}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-stone-500">{t("empty")}</p>
                )}
            </div>
            {pendingStatusUser ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-2xl">
                        <h2 className="text-base font-semibold text-stone-950">
                            {pendingStatusUser.enabled ? t("disableConfirmTitle") : t("restoreConfirmTitle")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                            {pendingStatusUser.enabled ? t("disableConfirmBody") : t("restoreConfirmBody")}
                        </p>
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                                onClick={() => setPendingStatusUser(null)}
                                type="button"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300 ${
                                    pendingStatusUser.enabled ? "bg-red-700 hover:bg-red-600" : "bg-stone-900 hover:bg-stone-700"
                                }`}
                                disabled={isStatusSaving}
                                onClick={confirmStatusChange}
                                type="button"
                            >
                                {isStatusSaving ? t("saving") : pendingStatusUser.enabled ? t("confirmDisable") : t("confirmRestore")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function RoleBadge({active = false, label}: {active?: boolean; label: string}) {
    return (
        <span className={`max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-stone-100 text-stone-700"}`}>
            {label}
        </span>
    );
}

function StatusBadge({active = false, enabled, label}: {active?: boolean; enabled: boolean; label: string}) {
    if (enabled) {
        return (
            <span className={`w-fit max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-emerald-50 text-emerald-800"}`}>
                {label}
            </span>
        );
    }

    return (
        <span className={`w-fit max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-stone-100 text-stone-600"}`}>
            {label}
        </span>
    );
}

function Info({label, value}: {label: string; value: string}) {
    return (
        <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="block break-words text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
            <span className="mt-1 block break-words">{value}</span>
        </div>
    );
}
