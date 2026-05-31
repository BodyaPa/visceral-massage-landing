"use client";

import {useEffect, useMemo, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import type {UserRole} from "@/features/auth/auth.roles";
import {useListUsersQuery, useUpdateUserRolesMutation} from "@/features/users/users.api";
import type {AdminUser} from "@/types/users";

const manageableRoles: UserRole[] = ["MASTER", "SPECIALIST", "FINANCE_MANAGER", "SMM"];
const allFilterRoles: UserRole[] = ["USER", ...manageableRoles];
const emptyUsers: AdminUser[] = [];

export default function UsersManagement() {
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
    const [updateRoles, {isLoading: isSaving}] = useUpdateUserRolesMutation();

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

    return (
        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-stone-950">{t("title")}</h1>
                        <p className="mt-1 text-sm text-stone-600">{t("subtitle")}</p>
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

                <div className="max-h-[62vh] overflow-auto rounded-lg border border-stone-200">
                    <table className="min-w-full table-fixed border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-stone-100 text-xs font-semibold uppercase text-stone-500">
                        <tr>
                            <th className="w-[36%] px-3 py-2">{t("name")}</th>
                            <th className="w-[34%] px-3 py-2">{t("contact")}</th>
                            <th className="w-[30%] px-3 py-2">{t("assignedRoles")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((user) => {
                            const active = user.id === selectedUser?.id;
                            const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || t("unnamed");

                            return (
                                <tr
                                    className={`cursor-pointer border-t border-stone-200 transition-colors ${
                                        active ? "bg-stone-900 text-white" : "bg-white text-stone-900 hover:bg-stone-50"
                                    }`}
                                    key={user.id}
                                    onClick={() => {
                                        setSelectedUserId(user.id);
                                        setSelectedRoles(user.roles);
                                    }}
                                >
                                    <td className="truncate px-3 py-2 font-medium">{name}</td>
                                    <td className={`truncate px-3 py-2 ${active ? "text-stone-200" : "text-stone-600"}`}>
                                        {user.email ?? user.phone ?? t("noContact")}
                                    </td>
                                    <td className={`truncate px-3 py-2 ${active ? "text-stone-200" : "text-stone-600"}`}>
                                        {user.roles.map((roleName) => t(`roles.${roleName}`)).join(", ")}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                    {!isFetching && users.length === 0 ? <p className="text-sm text-stone-500">{t("empty")}</p> : null}
                </div>
            </div>

            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                {selectedUser ? (
                    <div className="space-y-5">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">ID {selectedUser.id}</p>
                            <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                                {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || t("unnamed")}
                            </h2>
                            <div className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                                <Info label={t("phone")} value={selectedUser.phone ?? t("emptyValue")} />
                                <Info label={t("email")} value={selectedUser.email ?? t("emptyValue")} />
                                <Info label={t("status")} value={selectedUser.enabled ? t("enabled") : t("disabled")} />
                                <Info label={t("createdAt")} value={new Date(selectedUser.createdAt).toLocaleString()} />
                            </div>
                        </div>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold text-stone-900">{t("assignedRoles")}</legend>
                            <label className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                                <span>{t("roles.USER")}</span>
                                <input checked disabled readOnly type="checkbox" />
                            </label>
                            {manageableRoles.map((roleName) => (
                                <label
                                    className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900"
                                    key={roleName}
                                >
                                    <span>{t(`roles.${roleName}`)}</span>
                                    <input
                                        checked={hasRole.has(roleName)}
                                        onChange={() => toggleRole(roleName)}
                                        type="checkbox"
                                    />
                                </label>
                            ))}
                        </fieldset>

                        <button
                            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
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
        </section>
    );
}

function Info({label, value}: {label: string; value: string}) {
    return (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
            <span className="mt-1 block break-words">{value}</span>
        </div>
    );
}
