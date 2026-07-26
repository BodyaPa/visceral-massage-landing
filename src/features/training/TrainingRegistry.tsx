"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useGetAdminTrainingTimelineQuery, useListAdminTrainingRecordsQuery, useListTrainingTypesQuery, useSetTrainingAttendanceMutation} from "./training.api";
import type {AdminTrainingRecord, TrainingParticipantStatus, TrainingSessionStatus} from "@/types/training";
import Dialog from "@/components/ui/overlay/Dialog";
import {useListOfficesQuery, useListOfficeResourcesQuery} from "@/features/offices/offices.api";
import {useListUsersQuery} from "@/features/users/users.api";
import {API_URL} from "@/shared/constants/env";

export default function TrainingRegistry() {
    const t = useTranslations("admin.records");
    const locale = useLocale();
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [participantStatus, setParticipantStatus] = useState<TrainingParticipantStatus | "">("");
    const [sessionStatus, setSessionStatus] = useState<TrainingSessionStatus | "">("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [selected, setSelected] = useState<AdminTrainingRecord | null>(null);
    const [officeId, setOfficeId] = useState<number | "">("");
    const [resourceId, setResourceId] = useState<number | "">("");
    const [trainerId, setTrainerId] = useState<number | "">("");
    const [trainingTypeId, setTrainingTypeId] = useState<number | "">("");
    const [sort, setSort] = useState<"trainingSession.startsAt,desc" | "trainingSession.startsAt,asc" | "createdAt,desc" | "createdAt,asc">("trainingSession.startsAt,desc");
    const [setAttendance, {isLoading: attendanceSaving}] = useSetTrainingAttendanceMutation();
    const {data: officePage} = useListOfficesQuery({size: 100});
    const {data: resources = []} = useListOfficeResourcesQuery(Number(officeId), {skip: !officeId});
    const {data: trainerPage} = useListUsersQuery({role: "SPECIALIST", enabled: true, size: 100});
    const {data: trainingTypes = []} = useListTrainingTypesQuery();
    const result = useListAdminTrainingRecordsQuery({
        page, query, participantStatus, sessionStatus, officeId, resourceId, trainerId, trainingTypeId, sort,
        visitFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        visitTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined
    });
    const timeline = useGetAdminTrainingTimelineQuery(selected?.id ?? 0, {skip: selected === null});
    const exportParams = new URLSearchParams({sort});
    if (participantStatus) exportParams.set("participantStatus", participantStatus);
    if (sessionStatus) exportParams.set("sessionStatus", sessionStatus);
    if (query.trim()) exportParams.set("query", query.trim());
    if (from) exportParams.set("visitFrom", new Date(`${from}T00:00:00`).toISOString());
    if (to) exportParams.set("visitTo", new Date(`${to}T23:59:59.999`).toISOString());
    if (officeId) exportParams.set("officeId", String(officeId));
    if (resourceId) exportParams.set("resourceId", String(resourceId));
    if (trainerId) exportParams.set("trainerId", String(trainerId));
    if (trainingTypeId) exportParams.set("trainingTypeId", String(trainingTypeId));
    const exportUrl = `${API_URL}/api/admin/records/training/export.csv?${exportParams.toString()}`;
    const dateTime = (value: string) => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
    const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, {style: "currency", currency: "UAH", maximumFractionDigits: 2}).format(value);

    return <div className="space-y-5">
        <div className="flex justify-end"><a className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" href={exportUrl}>{t("exportCsv")}</a></div>
        <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-semibold text-stone-600 xl:col-span-2">{t("search")}<input className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" onChange={e => {setQuery(e.target.value); setPage(0);}} placeholder={t("searchPlaceholder")} value={query}/></label>
            <Select label={t("participantStatus")} value={participantStatus} onChange={value => {setParticipantStatus(value as TrainingParticipantStatus | ""); setPage(0);}} options={(["PAYMENT_PENDING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED", "EXPIRED"] as TrainingParticipantStatus[]).map(value => [value, t(`participantStatuses.${value}`)])} all={t("all")}/>
            <Select label={t("sessionStatus")} value={sessionStatus} onChange={value => {setSessionStatus(value as TrainingSessionStatus | ""); setPage(0);}} options={(["DRAFT", "PUBLISHED", "CANCELLED"] as TrainingSessionStatus[]).map(value => [value, t(`sessionStatuses.${value}`)])} all={t("all")}/>
            <div className="grid grid-cols-2 gap-2"><DateInput label={t("from")} value={from} onChange={value => {setFrom(value); setPage(0);}}/><DateInput label={t("to")} value={to} onChange={value => {setTo(value); setPage(0);}}/></div>
            <details className="sm:col-span-2 xl:col-span-5">
                <summary className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-stone-700 hover:text-stone-950">{t("advancedFilters")}</summary>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <CatalogSelect label={t("office")} value={officeId} onChange={value => {setOfficeId(value); setResourceId(""); setPage(0);}} options={(officePage?.content ?? []).filter(item => item.businessDirection === "TRAINING").map(item => [item.id, item.name])} all={t("all")}/>
                    <CatalogSelect disabled={!officeId} label={t("resource")} value={resourceId} onChange={value => {setResourceId(value); setPage(0);}} options={resources.map(item => [item.id, item.name])} all={t("all")}/>
                    <CatalogSelect label={t("trainer")} value={trainerId} onChange={value => {setTrainerId(value); setPage(0);}} options={(trainerPage?.content ?? []).map(item => [item.id, displayUser(item)])} all={t("all")}/>
                    <CatalogSelect label={t("trainingType")} value={trainingTypeId} onChange={value => {setTrainingTypeId(value); setPage(0);}} options={trainingTypes.map(item => [item.id, locale === "en" && item.titleEn ? item.titleEn : item.titleUa])} all={t("all")}/>
                    <label className="text-xs font-semibold text-stone-600">{t("sort")}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm" onChange={e => {setSort(e.target.value as typeof sort); setPage(0);}} value={sort}>{(["trainingSession.startsAt,desc", "trainingSession.startsAt,asc", "createdAt,desc", "createdAt,asc"] as const).map(value => <option key={value} value={value}>{t(`sortOptions.${value.replace("trainingSession.", "").replace(",", "_")}`)}</option>)}</select></label>
                </div>
            </details>
        </div>
        {result.isLoading ? <State text={t("loading")}/> : result.isError ? <State error text={t("error")}/> : result.data?.content.length === 0 ? <State text={t("emptyTraining")}/> :
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="hidden grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(170px,1.3fr)_130px_120px] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-500 md:grid"><span>{t("client")}</span><span>{t("trainer")}</span><span>{t("training")}</span><span>{t("visit")}</span><span>{t("status")}</span></div>
                {result.data?.content.map(record => <button className="grid w-full gap-2 border-b border-stone-100 px-4 py-4 text-left transition-colors last:border-0 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-900 md:grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(170px,1.3fr)_130px_120px] md:items-center" key={record.id} onClick={() => setSelected(record)}><span><strong className="block text-sm text-stone-950">{record.clientName}</strong><small className="text-stone-500">{record.clientContact || "—"}</small></span><span className="text-sm text-stone-700">{record.trainerName}</span><span><strong className="block text-sm text-stone-900">{locale === "en" && record.titleEn ? record.titleEn : record.titleUa}</strong><small className="text-stone-500">{record.officeName} · {record.resourceName}</small></span><span className="text-sm text-stone-700">{dateTime(record.startsAt)}</span><span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">{t(`participantStatuses.${record.participantStatus}`)}</span></button>)}
            </div>}
        {result.data && result.data.totalPages > 1 && <div className="flex items-center justify-between"><button className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t("previous")}</button><span className="text-sm text-stone-600">{t("page", {current: page + 1, total: result.data.totalPages})}</span><button className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={page + 1 >= result.data.totalPages} onClick={() => setPage(value => value + 1)}>{t("next")}</button></div>}
        <Dialog closeLabel={t("close")} onClose={() => setSelected(null)} open={selected !== null} title={selected ? `${t("trainingRecord")} #${selected.id}` : t("trainingRecord")}>{selected && <><dl className="grid gap-4 text-sm sm:grid-cols-2"><Detail label={t("client")} value={`${selected.clientName} · ${selected.clientContact || "—"}`}/><Detail label={t("trainer")} value={selected.trainerName}/><Detail label={t("training")} value={locale === "en" && selected.titleEn ? selected.titleEn : selected.titleUa}/><Detail label={t("visit")} value={`${dateTime(selected.startsAt)} — ${dateTime(selected.endsAt)}`}/><Detail label={t("location")} value={`${selected.officeName} · ${selected.resourceName}`}/><Detail label={t("sessionStatus")} value={t(`sessionStatuses.${selected.sessionStatus}`)}/><Detail label={t("price")} value={`${money(selected.finalPrice)} / ${money(selected.originalPrice)}`}/><Detail label={t("deposit")} value={money(selected.depositAmount)}/><Detail label={t("payment")} value={selected.paymentConfirmed ? t("paymentConfirmed") : t("paymentPending")}/><Detail label={t("benefit")} value={selected.paidWithMembership ? t("membership") : selected.paidWithLoyaltyVoucher ? t("voucher") : selected.promoCode || "—"}/><Detail label={t("joinedAt")} value={dateTime(selected.joinedAt)}/><Detail label={t("attendance")} value={selected.attendanceStatus ? t(`attendanceStatuses.${selected.attendanceStatus}`) : t("attendancePending")}/>{selected.cancellationReason && <Detail label={t("cancellation")} value={`${selected.cancellationReason}${selected.cancellationDetails ? ` · ${selected.cancellationDetails}` : ""}`}/>}</dl>{(["CONFIRMED", "ATTENDED", "NO_SHOW"] as TrainingParticipantStatus[]).includes(selected.participantStatus) && new Date(selected.endsAt).getTime() <= Date.now() ? <div className="mt-5 flex flex-wrap gap-2"><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50" disabled={attendanceSaving} onClick={() => void setAttendance({id: selected.id, status: "ATTENDED"}).unwrap().then(() => setSelected({...selected, participantStatus: "ATTENDED", attendanceStatus: "ATTENDED", attendanceDecidedAt: new Date().toISOString(), attendanceDefaulted: false}))} type="button">{t("markAttended")}</button><button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50" disabled={attendanceSaving} onClick={() => void setAttendance({id: selected.id, status: "NO_SHOW"}).unwrap().then(() => setSelected({...selected, participantStatus: "NO_SHOW", attendanceStatus: "NO_SHOW", attendanceDecidedAt: new Date().toISOString(), attendanceDefaulted: false}))} type="button">{t("markNoShow")}</button></div> : null}<Timeline loading={timeline.isLoading} entries={timeline.data ?? []} dateTime={dateTime} t={t}/></>}</Dialog>
    </div>;
}

function Select({label, value, onChange, options, all}: {label: string; value: string; onChange: (value: string) => void; options: string[][]; all: string}) { return <label className="text-xs font-semibold text-stone-600">{label}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm" onChange={e => onChange(e.target.value)} value={value}><option value="">{all}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function DateInput({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) { return <label className="text-xs font-semibold text-stone-600">{label}<input className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-2 text-sm" onChange={e => onChange(e.target.value)} type="date" value={value}/></label>; }
function Detail({label, value}: {label: string; value: string}) { return <div><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 text-stone-900">{value}</dd></div>; }
function State({text, error = false}: {text: string; error?: boolean}) { return <p className={error ? "rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" : "rounded-2xl bg-white p-6 text-stone-600"}>{text}</p>; }
function CatalogSelect({label, value, onChange, options, all, disabled = false}: {label: string; value: number | ""; onChange: (value: number | "") => void; options: Array<[number, string]>; all: string; disabled?: boolean}) { return <label className="text-xs font-semibold text-stone-600">{label}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm disabled:bg-stone-100" disabled={disabled} onChange={e => onChange(e.target.value ? Number(e.target.value) : "")} value={value}><option value="">{all}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function displayUser(user: {firstName: string | null; lastName: string | null; email: string | null; phone: string | null}) { return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "—"; }
function Timeline({entries, loading, dateTime, t}: {entries: import("@/types/bookings").RecordAuditEntry[]; loading: boolean; dateTime: (value: string) => string; t: ReturnType<typeof useTranslations>}) { return <section className="mt-6 border-t border-stone-200 pt-5"><h3 className="text-sm font-semibold text-stone-950">{t("timeline")}</h3>{loading ? <p className="mt-3 text-sm text-stone-500">{t("loading")}</p> : <ol className="mt-3 space-y-3">{entries.map(entry => <li className="relative border-l-2 border-stone-200 pl-4 text-sm" key={entry.id}><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-stone-700"/><strong className="block text-stone-900">{t(`auditActions.${entry.action}`)}</strong><span className="text-stone-500">{dateTime(entry.occurredAt)} · {entry.actorName || t("systemActor")}</span></li>)}</ol>}</section>; }
