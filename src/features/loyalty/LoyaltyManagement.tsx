"use client";

import {FormEvent, useEffect, useMemo, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useListAdminServicesQuery} from "@/features/services/services.api";
import {useListPublicEventsQuery} from "@/features/schedule/schedule.api";
import AdminUserPicker from "@/features/users/AdminUserPicker";
import type {Locale} from "@/i18n";
import type {AdminUser} from "@/types/users";
import {
    useCreateAdminLoyaltyRewardMutation,
    useCreateLoyaltyAdjustmentMutation,
    useGetAdminLoyaltyRewardsQuery,
    useUpdateAdminLoyaltyRewardMutation
} from "@/features/loyalty/loyalty.api";
import type {LoyaltyReward} from "@/types/loyalty";
import OverlayPortal from "@/components/ui/overlay/OverlayPortal";

type RewardBody = Omit<LoyaltyReward, "id" | "createdAt" | "updatedAt">;

export default function LoyaltyManagement({locale}: {locale: Locale}) {
    const t = useTranslations("admin.loyalty");
    const toast = useToast();
    const {data: rewards = [], isLoading, isError} = useGetAdminLoyaltyRewardsQuery();
    const {data: servicesData} = useListAdminServicesQuery({size: 200});
    const eventRange = useMemo(upcomingEventRange, []);
    const {data: events = [], isFetching: eventsFetching} = useListPublicEventsQuery({...eventRange, lang: locale});
    const [createReward, {isLoading: creating}] = useCreateAdminLoyaltyRewardMutation();
    const [updateReward, {isLoading: updating}] = useUpdateAdminLoyaltyRewardMutation();
    const [adjust, {isLoading: adjusting}] = useCreateLoyaltyAdjustmentMutation();
    const [editing, setEditing] = useState<LoyaltyReward | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [adjustmentUser, setAdjustmentUser] = useState<AdminUser | null>(null);
    const services = servicesData?.content ?? [];

    async function submitReward(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const body: RewardBody = {
            titleUa: String(form.get("titleUa") ?? "").trim(),
            titleEn: textOrNull(form.get("titleEn")),
            descriptionUa: textOrNull(form.get("descriptionUa")),
            descriptionEn: textOrNull(form.get("descriptionEn")),
            pointCost: Number(form.get("pointCost")),
            validityDays: optionalPositiveNumber(form.get("validityDays")),
            transferable: form.get("transferable") === "on",
            active: form.get("active") === "on",
            eligibleServiceIds: form.getAll("serviceIds").map(Number),
            eligibleEventIds: form.getAll("eventIds").map(Number)
        };
        try {
            if (editing) await updateReward({id: editing.id, body}).unwrap();
            else await createReward(body).unwrap();
            toast.success(t(editing ? "updated" : "created"));
            setEditing(null);
            setEditorOpen(false);
            formElement.reset();
        } catch {
            toast.error(t("saveError"));
        }
    }

    async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
            if (!adjustmentUser) return;
            await adjust({userId: adjustmentUser.id, amount: Number(form.get("amount")), reason: String(form.get("reason") ?? "").trim()}).unwrap();
            toast.success(t("adjusted"));
            setAdjustmentUser(null);
            formElement.reset();
        } catch {
            toast.error(t("adjustError"));
        }
    }

    useEffect(() => {
        if (!editorOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setEditing(null);
                setEditorOpen(false);
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [editorOpen]);

    return (
        <main className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500">ADMIN</p>
                    <h1 className="mt-2 text-2xl font-semibold text-stone-950">{t("title")}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t("subtitle")}</p>
                </div>
                <button className={`${primaryButton} w-full sm:w-auto`} onClick={() => {setEditing(null);setEditorOpen(true)}} type="button">{t("newReward")}</button>
            </header>

            {editorOpen ? <OverlayPortal><div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-stone-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => {
                if (event.target === event.currentTarget) {setEditing(null);setEditorOpen(false)}
            }}>
            <form aria-labelledby="loyalty-editor-title" aria-modal="true" className="h-full w-full space-y-4 overflow-y-auto bg-white p-4 shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-stone-200 sm:p-5" key={editing?.id ?? "new"} onSubmit={submitReward} role="dialog">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-100 bg-white pb-3"><div><h2 className="font-semibold text-stone-950" id="loyalty-editor-title">{editing ? t("editReward") : t("newReward")}</h2><p className="mt-1 text-xs text-stone-500">{t("rewardHint")}</p></div><button aria-label={t("cancelEdit")} className={secondaryButton} onClick={() => {setEditing(null);setEditorOpen(false)}} type="button">×</button></div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Field label={t("titleUa")}><input className={inputClass} defaultValue={editing?.titleUa} name="titleUa" required /></Field>
                    <Field label={t("titleEn")}><input className={inputClass} defaultValue={editing?.titleEn ?? ""} name="titleEn" /></Field>
                    <Field label={t("descriptionUa")}><textarea className={textareaClass} defaultValue={editing?.descriptionUa ?? ""} name="descriptionUa" /></Field>
                    <Field label={t("descriptionEn")}><textarea className={textareaClass} defaultValue={editing?.descriptionEn ?? ""} name="descriptionEn" /></Field>
                    <Field label={t("pointCost")}><input className={inputClass} defaultValue={editing?.pointCost ?? 100} min={1} name="pointCost" required type="number" /></Field>
                    <Field label={t("validityDays")}><input className={inputClass} defaultValue={editing?.validityDays ?? ""} min={1} name="validityDays" placeholder={t("validityUnlimited")} type="number" /></Field>
                    <div className="grid grid-cols-2 gap-2">
                        <Check defaultChecked={editing?.transferable ?? false} label={t("transferable")} name="transferable" />
                        <Check defaultChecked={editing?.active ?? true} label={t("active")} name="active" />
                    </div>
                </div>
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <legend className="px-1 text-sm font-semibold text-stone-800">{t("eligibleServices")}</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {services.map((service) => <Check defaultChecked={editing?.eligibleServiceIds.includes(service.id) ?? false} key={service.id} label={locale === "en" ? service.titleEn || service.titleUa : service.titleUa} name="serviceIds" value={service.id} />)}
                    </div>
                    {services.length === 0 ? <p className="text-sm text-stone-500">{t("noServices")}</p> : null}
                </fieldset>
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <legend className="px-1 text-sm font-semibold text-stone-800">{t("eligibleEvents")}</legend>
                    <p className="mb-2 text-xs leading-5 text-stone-500">{t("eligibleEventsHint")}</p>
                    {eventsFetching ? <p className="text-sm text-stone-500">{t("eventsLoading")}</p> : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {events.map((event) => <Check defaultChecked={editing?.eligibleEventIds.includes(event.id) ?? false} key={event.id} label={eventLabel(event, locale)} name="eventIds" value={event.id} />)}
                    </div>
                    {!eventsFetching && events.length === 0 ? <p className="text-sm text-stone-500">{t("noEvents")}</p> : null}
                </fieldset>
                <div className="flex justify-end"><button className={primaryButton} disabled={creating || updating}>{creating || updating ? t("saving") : t("save")}</button></div>
            </form></div></OverlayPortal> : null}

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-stone-950">{t("catalog")}</h2><button className={secondaryButton} onClick={() => {setEditing(null);setEditorOpen(true)}} type="button">{t("newReward")}</button></div>
                {isLoading ? <p className="mt-3 text-sm text-stone-500">{t("loading")}</p> : null}
                {isError ? <p className="mt-3 text-sm text-red-700">{t("loadError")}</p> : null}
                {!isLoading && rewards.length === 0 ? <p className="mt-3 text-sm text-stone-500">{t("empty")}</p> : null}
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {rewards.map((reward) => <article className="rounded-xl border border-stone-200 p-4" key={reward.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-stone-950">{reward.titleUa}</h3><p className="mt-1 text-sm text-stone-600">{reward.pointCost} · {t("pointsShort")} · {reward.validityDays === null ? t("unlimited") : `${reward.validityDays} ${t("daysShort")}`}</p></div><span className={reward.active ? activeBadge : inactiveBadge}>{t(reward.active ? "active" : "inactive")}</span></div><p className="mt-2 text-xs text-stone-500">{reward.transferable ? t("transferable") : t("personal")}</p><div className="mt-3 flex justify-end"><button className={secondaryButton} onClick={() => {setEditing(reward);setEditorOpen(true)}} type="button">{t("edit")}</button></div></article>)}
                </div>
            </section>

            <form className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,1.1fr)_160px_minmax(0,1fr)_auto] md:items-end" onSubmit={submitAdjustment}>
                <AdminUserPicker clearLabel={t("clearUser")} emptyLabel={t("noUsers")} label={t("user")} loadingLabel={t("usersLoading")} onSelect={setAdjustmentUser} searchPlaceholder={t("userSearch")} selectedUser={adjustmentUser} />
                <Field label={t("amount")}><input className={inputClass} name="amount" required type="number" /></Field>
                <Field label={t("reason")}><input className={inputClass} maxLength={500} name="reason" required /></Field>
                <button className={primaryButton} disabled={adjusting || !adjustmentUser}>{adjusting ? t("saving") : t("adjust")}</button>
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
function optionalPositiveNumber(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); return text ? Number(text) : null; }
function upcomingEventRange() {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 90);
    to.setHours(23, 59, 59, 999);
    return {from: from.toISOString(), to: to.toISOString()};
}

function eventLabel(event: {title: string; specialistName: string; startsAt: string}, locale: Locale) {
    return `${event.title} · ${event.specialistName} · ${new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-GB", {dateStyle: "medium", timeStyle: "short"}).format(new Date(event.startsAt))}`;
}
