"use client";

import {FormEvent, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {ManagementPage, ManagementPageHeader, ManagementSurface} from "@/components/management/ManagementPage";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/ui/form/Checkbox";
import Field from "@/components/ui/form/Field";
import Input from "@/components/ui/form/Input";
import Select from "@/components/ui/form/Select";
import EmptyState from "@/components/ui/state/EmptyState";
import ErrorState from "@/components/ui/state/ErrorState";
import LoadingState from "@/components/ui/state/LoadingState";
import StatusBadge from "@/components/ui/state/StatusBadge";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useListTrainingTypesQuery} from "@/features/training/training.api";
import AdminUserPicker from "@/features/users/AdminUserPicker";
import type {AdminUser} from "@/types/users";
import {useCreatePromoMutation, useListPromosQuery, usePromoHistoryQuery, useUpdatePromoMutation} from "./promos.api";

export default function PromoCodesManagement() {
    const t = useTranslations("admin.promos");
    const locale = useLocale();
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<"" | "true" | "false">("");
    const [historyId, setHistoryId] = useState<number | null>(null);
    const [assignedUser, setAssignedUser] = useState<AdminUser | null>(null);
    const promos = useListPromosQuery({query: query || undefined, active: active === "" ? undefined : active === "true"});
    const {data: trainingTypes = [], isLoading: trainingTypesLoading, isError: trainingTypesError, refetch: refetchTrainingTypes} = useListTrainingTypesQuery();
    const history = usePromoHistoryQuery(historyId!, {skip: historyId === null});
    const [createPromo, {isLoading: saving}] = useCreatePromoMutation();
    const [updatePromo, {isLoading: updating}] = useUpdatePromoMutation();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
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
                trainingTypeIds: form.getAll("trainingTypeIds").map(Number)
            }).unwrap();
            formElement.reset();
            setAssignedUser(null);
            toast.success(t("created"));
        } catch {
            toast.error(t("error"));
        }
    }

    async function toggleActive(promo: NonNullable<typeof promos.data>["content"][number]) {
        try {
            await updatePromo({id: promo.id, body: {
                discountPercent: promo.discountPercent,
                startsAt: promo.startsAt,
                endsAt: promo.endsAt,
                active: !promo.active,
                totalLimit: promo.totalLimit,
                perUserLimit: promo.perUserLimit,
                assignedUserId: promo.assignedUserId,
                serviceIds: promo.serviceIds,
                trainingTypeIds: promo.trainingTypeIds
            }}).unwrap();
        } catch {
            toast.error(t("error"));
        }
    }

    return (
        <ManagementPage>
            <ManagementPageHeader description={t("subtitle")} eyebrow={t("eyebrow")} title={t("title")} />
            <ManagementSurface>
                <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
                    <Field htmlFor="promo-discount" label={t("discount")}><Input id="promo-discount" max={100} min={1} name="discount" required type="number" /></Field>
                    <Field htmlFor="promo-total-limit" label={t("totalLimit")}><Input id="promo-total-limit" min={1} name="totalLimit" type="number" /></Field>
                    <Field htmlFor="promo-user-limit" label={t("perUserLimit")}><Input id="promo-user-limit" min={1} name="perUserLimit" type="number" /></Field>
                    <div className="sm:col-span-2 xl:col-span-1">
                        <AdminUserPicker clearLabel={t("clearUser")} emptyLabel={t("noUsers")} label={t("assignedUser")} loadingLabel={t("usersLoading")} onSelect={setAssignedUser} optionalLabel={t("optional")} searchPlaceholder={t("userSearch")} selectedUser={assignedUser} />
                    </div>
                    <Field htmlFor="promo-start" label={t("startsAt")}><Input id="promo-start" name="startsAt" type="datetime-local" /></Field>
                    <Field htmlFor="promo-end" label={t("endsAt")}><Input id="promo-end" name="endsAt" type="datetime-local" /></Field>
                    <fieldset className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:col-span-2 xl:col-span-4">
                        <legend className="px-1 text-sm font-semibold text-stone-800">{t("trainingTypes")}</legend>
                        <p className="mb-3 text-xs leading-5 text-stone-500">{t("trainingTypesHint")}</p>
                        {trainingTypesLoading ? <LoadingState label={t("trainingTypesLoading")} /> : null}
                        {trainingTypesError ? <ErrorState action={<Button onClick={() => void refetchTrainingTypes()} size="sm" variant="secondary">{t("retry")}</Button>} title={t("trainingTypesError")} /> : null}
                        {!trainingTypesLoading && !trainingTypesError && trainingTypes.length === 0 ? <EmptyState title={t("noTrainingTypes")} /> : null}
                        {!trainingTypesLoading && !trainingTypesError && trainingTypes.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {trainingTypes.map((type) => (
                                    <Checkbox className="rounded-lg border border-stone-200 bg-white px-3 py-2" hint={!type.active ? t("inactiveTrainingType") : undefined} id={`promo-training-type-${type.id}`} key={type.id} label={locale === "en" ? type.titleEn || type.titleUa : type.titleUa} name="trainingTypeIds" value={type.id} />
                                ))}
                            </div>
                        ) : null}
                    </fieldset>
                    <div className="flex items-end sm:col-span-2 xl:col-span-4 xl:justify-end">
                        <Button disabled={saving} fullWidth size="lg" type="submit" className="xl:w-auto">{saving ? t("saving") : t("generate")}</Button>
                    </div>
                </form>
            </ManagementSurface>
            <ManagementSurface>
                <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <Field htmlFor="promo-search" label={t("search")}><Input id="promo-search" onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} type="search" value={query} /></Field>
                    <Field htmlFor="promo-active" label={t("status")}><Select id="promo-active" onChange={(event) => setActive(event.target.value as typeof active)} value={active}><option value="">{t("all")}</option><option value="true">{t("active")}</option><option value="false">{t("inactive")}</option></Select></Field>
                </div>
                {promos.isLoading || promos.isFetching ? <LoadingState label={t("loading")} /> : null}
                {promos.isError ? <ErrorState action={<Button onClick={() => void promos.refetch()} size="sm" variant="secondary">{t("retry")}</Button>} title={t("error")} /> : null}
                {!promos.isLoading && !promos.isFetching && !promos.isError && promos.data?.content.length ? (
                    <div className="space-y-3">
                        {promos.data.content.map((promo) => (
                            <article className="rounded-xl border border-stone-200 p-4 transition-colors duration-200 hover:border-stone-300 motion-reduce:transition-none" key={promo.id}>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <code className="break-all font-bold text-stone-950">{promo.code}</code>
                                            <StatusBadge tone={promo.active ? "success" : "neutral"}>{promo.active ? t("active") : t("inactive")}</StatusBadge>
                                        </div>
                                        <p className="mt-2 text-sm text-stone-600">{promo.discountPercent}% · {promo.usageCount}/{promo.totalLimit ?? "∞"}</p>
                                        {promo.assignedUserDisplay ? <p className="mt-1 break-words text-xs text-stone-500">{t("assignedTo", {user: promo.assignedUserDisplay})}</p> : null}
                                        <p className="mt-1 break-words text-xs text-stone-500">{promo.trainingTypeIds.length > 0 ? t("trainingScope", {types: trainingTypeNames(promo.trainingTypeIds, trainingTypes, locale)}) : t("allTrainingTypes")}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button aria-expanded={historyId === promo.id} onClick={() => setHistoryId(historyId === promo.id ? null : promo.id)} size="sm" variant="secondary">{t("history")}</Button>
                                        <Button disabled={updating} onClick={() => void toggleActive(promo)} size="sm" variant="secondary">{promo.active ? t("deactivate") : t("activate")}</Button>
                                    </div>
                                </div>
                                {historyId === promo.id ? (
                                    <div className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
                                        {history.isLoading || history.isFetching ? <LoadingState label={t("loading")} /> : null}
                                        {history.isError ? <ErrorState action={<Button onClick={() => void history.refetch()} size="sm" variant="secondary">{t("retry")}</Button>} title={t("error")} /> : null}
                                        {!history.isLoading && !history.isFetching && !history.isError && history.data?.content.length ? history.data.content.map((usage) => <p className="break-words border-b border-stone-100 py-2 last:border-0" key={usage.id}>{usage.userDisplay} · {usage.originalPrice} → {usage.finalPrice}</p>) : null}
                                        {!history.isLoading && !history.isFetching && !history.isError && !history.data?.content.length ? <EmptyState title={t("noHistory")} /> : null}
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                ) : null}
                {!promos.isLoading && !promos.isFetching && !promos.isError && !promos.data?.content.length ? <EmptyState title={t("empty")} /> : null}
            </ManagementSurface>
        </ManagementPage>
    );
}

function numberValue(value: FormDataEntryValue | null) { return value && String(value).trim() ? Number(value) : null; }
function dateValue(value: FormDataEntryValue | null) { return value && String(value).trim() ? new Date(String(value)).toISOString() : null; }
function trainingTypeNames(ids: number[], types: {id: number; titleUa: string; titleEn: string | null}[], locale: string) {
    return ids.map((id) => {
        const type = types.find((item) => item.id === id);
        return type ? (locale === "en" ? type.titleEn || type.titleUa : type.titleUa) : `#${id}`;
    }).join(", ");
}
