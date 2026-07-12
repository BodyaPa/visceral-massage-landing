"use client";

import {FormEvent, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useListAdminServicesQuery} from "@/features/services/services.api";
import {
    useCreateAdminLoyaltyRewardMutation,
    useCreateLoyaltyAdjustmentMutation,
    useGetAdminLoyaltyRewardsQuery,
    useUpdateAdminLoyaltyRewardMutation
} from "@/features/loyalty/loyalty.api";
import type {LoyaltyReward} from "@/types/loyalty";

type RewardBody = Omit<LoyaltyReward, "id" | "createdAt" | "updatedAt">;

export default function LoyaltyManagement() {
    const t = useTranslations("admin.loyalty");
    const toast = useToast();
    const {data: rewards = [], isLoading, isError} = useGetAdminLoyaltyRewardsQuery();
    const {data: servicesData} = useListAdminServicesQuery({size: 200});
    const [createReward, {isLoading: creating}] = useCreateAdminLoyaltyRewardMutation();
    const [updateReward, {isLoading: updating}] = useUpdateAdminLoyaltyRewardMutation();
    const [adjust, {isLoading: adjusting}] = useCreateLoyaltyAdjustmentMutation();
    const [editing, setEditing] = useState<LoyaltyReward | null>(null);
    const services = servicesData?.content ?? [];

    async function submitReward(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const body: RewardBody = {
            titleUa: String(form.get("titleUa") ?? "").trim(),
            titleEn: textOrNull(form.get("titleEn")),
            descriptionUa: textOrNull(form.get("descriptionUa")),
            descriptionEn: textOrNull(form.get("descriptionEn")),
            pointCost: Number(form.get("pointCost")),
            validityDays: Number(form.get("validityDays")),
            transferable: form.get("transferable") === "on",
            active: form.get("active") === "on",
            eligibleServiceIds: form.getAll("serviceIds").map(Number),
            eligibleEventIds: parseIds(String(form.get("eventIds") ?? ""))
        };
        try {
            if (editing) await updateReward({id: editing.id, body}).unwrap();
            else await createReward(body).unwrap();
            toast.success(t(editing ? "updated" : "created"));
            setEditing(null);
            event.currentTarget.reset();
        } catch {
            toast.error(t("saveError"));
        }
    }

    async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await adjust({userId: Number(form.get("userId")), amount: Number(form.get("amount")), reason: String(form.get("reason") ?? "").trim()}).unwrap();
            toast.success(t("adjusted"));
            event.currentTarget.reset();
        } catch {
            toast.error(t("adjustError"));
        }
    }

    return (
        <main className="space-y-6">
            <header>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500">MASTER</p>
                <h1 className="mt-2 text-2xl font-semibold text-stone-950">{t("title")}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t("subtitle")}</p>
            </header>

            <form className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5" key={editing?.id ?? "new"} onSubmit={submitReward}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-stone-950">{editing ? t("editReward") : t("newReward")}</h2><p className="mt-1 text-xs text-stone-500">{t("rewardHint")}</p></div>{editing ? <button className={secondaryButton} onClick={() => setEditing(null)} type="button">{t("cancelEdit")}</button> : null}</div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t("titleUa")}><input className={inputClass} defaultValue={editing?.titleUa} name="titleUa" required /></Field>
                    <Field label={t("titleEn")}><input className={inputClass} defaultValue={editing?.titleEn ?? ""} name="titleEn" /></Field>
                    <Field label={t("descriptionUa")}><textarea className={textareaClass} defaultValue={editing?.descriptionUa ?? ""} name="descriptionUa" /></Field>
                    <Field label={t("descriptionEn")}><textarea className={textareaClass} defaultValue={editing?.descriptionEn ?? ""} name="descriptionEn" /></Field>
                    <Field label={t("pointCost")}><input className={inputClass} defaultValue={editing?.pointCost ?? 100} min={1} name="pointCost" required type="number" /></Field>
                    <Field label={t("validityDays")}><input className={inputClass} defaultValue={editing?.validityDays ?? 30} min={1} name="validityDays" required type="number" /></Field>
                    <Field label={t("eventIds")}><input className={inputClass} defaultValue={editing?.eligibleEventIds.join(", ") ?? ""} name="eventIds" placeholder="12, 18" /></Field>
                    <div className="grid grid-cols-2 gap-2">
                        <Check defaultChecked={editing?.transferable ?? false} label={t("transferable")} name="transferable" />
                        <Check defaultChecked={editing?.active ?? true} label={t("active")} name="active" />
                    </div>
                </div>
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <legend className="px-1 text-sm font-semibold text-stone-800">{t("eligibleServices")}</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {services.map((service) => <Check defaultChecked={editing?.eligibleServiceIds.includes(service.id) ?? false} key={service.id} label={service.titleUa} name="serviceIds" value={service.id} />)}
                    </div>
                    {services.length === 0 ? <p className="text-sm text-stone-500">{t("noServices")}</p> : null}
                </fieldset>
                <button className={primaryButton} disabled={creating || updating}>{creating || updating ? t("saving") : t("save")}</button>
            </form>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="font-semibold text-stone-950">{t("catalog")}</h2>
                {isLoading ? <p className="mt-3 text-sm text-stone-500">{t("loading")}</p> : null}
                {isError ? <p className="mt-3 text-sm text-red-700">{t("loadError")}</p> : null}
                {!isLoading && rewards.length === 0 ? <p className="mt-3 text-sm text-stone-500">{t("empty")}</p> : null}
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {rewards.map((reward) => <article className="rounded-xl border border-stone-200 p-4" key={reward.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-stone-950">{reward.titleUa}</h3><p className="mt-1 text-sm text-stone-600">{reward.pointCost} · {t("pointsShort")} · {reward.validityDays} {t("daysShort")}</p></div><span className={reward.active ? activeBadge : inactiveBadge}>{t(reward.active ? "active" : "inactive")}</span></div><p className="mt-2 text-xs text-stone-500">{reward.transferable ? t("transferable") : t("personal")}</p><button className={`${secondaryButton} mt-3`} onClick={() => setEditing(reward)} type="button">{t("edit")}</button></article>)}
                </div>
            </section>

            <form className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[160px_160px_minmax(0,1fr)_auto] md:items-end" onSubmit={submitAdjustment}>
                <Field label={t("userId")}><input className={inputClass} min={1} name="userId" required type="number" /></Field>
                <Field label={t("amount")}><input className={inputClass} name="amount" required type="number" /></Field>
                <Field label={t("reason")}><input className={inputClass} maxLength={500} name="reason" required /></Field>
                <button className={primaryButton} disabled={adjusting}>{adjusting ? t("saving") : t("adjust")}</button>
            </form>
        </main>
    );
}

const inputClass = "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200";
const textareaClass = `${inputClass} min-h-24 resize-y`;
const primaryButton = "min-h-11 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300";
const secondaryButton = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50";
const activeBadge = "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800";
const inactiveBadge = "rounded-full border border-stone-200 bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600";
function Field({label, children}: {label: string; children: React.ReactNode}) { return <label className="block text-sm font-semibold text-stone-800">{label}<span className="mt-1.5 block">{children}</span></label>; }
function Check({defaultChecked, label, name, value}: {defaultChecked: boolean; label: string; name: string; value?: number}) { return <label className="flex min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"><input defaultChecked={defaultChecked} name={name} type="checkbox" value={value} /><span className="min-w-0 break-words">{label}</span></label>; }
function textOrNull(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); return text || null; }
function parseIds(value: string) { return Array.from(new Set(value.split(/[\s,;]+/).map(Number).filter((id) => Number.isInteger(id) && id > 0))); }
