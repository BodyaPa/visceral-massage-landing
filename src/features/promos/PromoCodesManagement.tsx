"use client";

import {FormEvent, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import AdminUserPicker from "@/features/users/AdminUserPicker";
import type {AdminUser} from "@/types/users";
import {useCreatePromoMutation, useListPromosQuery, usePromoHistoryQuery, useUpdatePromoMutation} from "./promos.api";

export default function PromoCodesManagement() {
    const t = useTranslations("admin.promos");
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<"" | "true" | "false">("");
    const [historyId, setHistoryId] = useState<number | null>(null);
    const [assignedUser, setAssignedUser] = useState<AdminUser | null>(null);
    const {data, isLoading} = useListPromosQuery({query: query || undefined, active: active === "" ? undefined : active === "true"});
    const {data: history} = usePromoHistoryQuery(historyId!, {skip: historyId === null});
    const [createPromo, {isLoading: saving}] = useCreatePromoMutation();
    const [updatePromo] = useUpdatePromoMutation();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await createPromo({
                discountPercent: Number(form.get("discount")),
                startsAt: dateValue(form.get("startsAt")),
                endsAt: dateValue(form.get("endsAt")),
                active: true,
                totalLimit: numberValue(form.get("totalLimit")),
                perUserLimit: numberValue(form.get("perUserLimit")),
                assignedUserId: assignedUser?.id ?? null,
                serviceIds: [],
                eventIds: []
            }).unwrap();
            event.currentTarget.reset();
            setAssignedUser(null);
            toast.success(t("created"));
        } catch {
            toast.error(t("error"));
        }
    }

    return (
        <main className="space-y-6">
            <header>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500">{t("eyebrow")}</p>
                <h1 className="mt-2 text-2xl font-semibold text-stone-950">{t("title")}</h1>
                <p className="mt-2 text-sm text-stone-600">{t("subtitle")}</p>
            </header>
            <form className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
                <Field label={t("discount")}><input className={inputClass} max={100} min={1} name="discount" required type="number" /></Field>
                <Field label={t("totalLimit")}><input className={inputClass} min={1} name="totalLimit" type="number" /></Field>
                <Field label={t("perUserLimit")}><input className={inputClass} min={1} name="perUserLimit" type="number" /></Field>
                <div className="sm:col-span-2 xl:col-span-1">
                    <AdminUserPicker clearLabel={t("clearUser")} emptyLabel={t("noUsers")} label={t("assignedUser")} loadingLabel={t("usersLoading")} onSelect={setAssignedUser} optionalLabel={t("optional")} searchPlaceholder={t("userSearch")} selectedUser={assignedUser} />
                </div>
                <Field label={t("startsAt")}><input className={inputClass} name="startsAt" type="datetime-local" /></Field>
                <Field label={t("endsAt")}><input className={inputClass} name="endsAt" type="datetime-local" /></Field>
                <div className="flex items-end sm:col-span-2"><button className="min-h-11 w-full rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:bg-stone-300" disabled={saving}>{saving ? t("saving") : t("generate")}</button></div>
            </form>
            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                    <input aria-label={t("search")} className={inputClass} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} value={query} />
                    <select className={inputClass} onChange={(event) => setActive(event.target.value as typeof active)} value={active}><option value="">{t("all")}</option><option value="true">{t("active")}</option><option value="false">{t("inactive")}</option></select>
                </div>
                {isLoading ? <p className="text-sm text-stone-500">{t("loading")}</p> : data?.content.length ? (
                    <div className="space-y-3">
                        {data.content.map((promo) => (
                            <article className="rounded-xl border border-stone-200 p-4" key={promo.id}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div><code className="font-bold text-stone-950">{promo.code}</code><p className="mt-1 text-sm text-stone-600">{promo.discountPercent}% · {promo.usageCount}/{promo.totalLimit ?? "∞"}</p>{promo.assignedUserDisplay ? <p className="mt-1 text-xs text-stone-500">{t("assignedTo", {user: promo.assignedUserDisplay})}</p> : null}</div>
                                    <div className="flex gap-2"><button className={secondaryButton} onClick={() => setHistoryId(historyId === promo.id ? null : promo.id)} type="button">{t("history")}</button><button className={secondaryButton} onClick={() => void updatePromo({id: promo.id, body: {discountPercent: promo.discountPercent, startsAt: promo.startsAt, endsAt: promo.endsAt, active: !promo.active, totalLimit: promo.totalLimit, perUserLimit: promo.perUserLimit, assignedUserId: promo.assignedUserId, serviceIds: promo.serviceIds, eventIds: promo.eventIds}})} type="button">{promo.active ? t("deactivate") : t("activate")}</button></div>
                                </div>
                                {historyId === promo.id ? <div className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-600">{history?.content.length ? history.content.map((usage) => <p className="py-1" key={usage.id}>{usage.userDisplay} · {usage.originalPrice} → {usage.finalPrice}</p>) : t("noHistory")}</div> : null}
                            </article>
                        ))}
                    </div>
                ) : <p className="text-sm text-stone-500">{t("empty")}</p>}
            </section>
        </main>
    );
}

const inputClass = "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-200";
const secondaryButton = "rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-50";
function Field({label, children}: {label: string; children: React.ReactNode}) { return <label className="block text-sm font-semibold text-stone-800">{label}<span className="mt-1.5 block">{children}</span></label>; }
function numberValue(value: FormDataEntryValue | null) { return value && String(value).trim() ? Number(value) : null; }
function dateValue(value: FormDataEntryValue | null) { return value && String(value).trim() ? new Date(String(value)).toISOString() : null; }
