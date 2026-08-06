"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useGetAdminBookingTimelineQuery, useListAdminBookingRecordsQuery, useSetBookingAttendanceMutation} from "./bookings.api";
import type {AdminBookingRecord, BookingSource, BookingStatus} from "@/types/bookings";
import Dialog from "@/components/ui/overlay/Dialog";
import TrainingRegistry from "@/features/training/TrainingRegistry";
import {useListOfficesQuery, useListOfficeResourcesQuery} from "@/features/offices/offices.api";
import {useListUsersQuery} from "@/features/users/users.api";
import {useListAdminServicesQuery} from "@/features/services/services.api";
import {API_URL} from "@/shared/constants/env";

const statuses: BookingStatus[] = ["PAYMENT_PENDING", "CONFIRMED", "CANCELLED"];
const sources: BookingSource[] = ["PUBLIC_ACCOUNT", "ADMIN_MANUAL", "GUEST"];

export default function BookingRegistry() {
    const t = useTranslations("admin.records");
    const locale = useLocale();
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<BookingStatus | "">("");
    const [source, setSource] = useState<BookingSource | "">("");
    const [direction, setDirection] = useState<"MASSAGE" | "TRAINING" | "">("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [selected, setSelected] = useState<AdminBookingRecord | null>(null);
    const [recordKind, setRecordKind] = useState<"BOOKING" | "TRAINING">("BOOKING");
    const [officeId, setOfficeId] = useState<number | "">("");
    const [resourceId, setResourceId] = useState<number | "">("");
    const [specialistId, setSpecialistId] = useState<number | "">("");
    const [serviceId, setServiceId] = useState<number | "">("");
    const [sort, setSort] = useState<"startsAt,desc" | "startsAt,asc" | "createdAt,desc" | "createdAt,asc">("startsAt,desc");
    const [setAttendance, {isLoading: attendanceSaving}] = useSetBookingAttendanceMutation();
    const {data: officePage} = useListOfficesQuery({size: 100});
    const {data: resources = []} = useListOfficeResourcesQuery(Number(officeId), {skip: !officeId});
    const {data: specialistPage} = useListUsersQuery({role: "SPECIALIST", enabled: true, size: 100});
    const {data: servicePage} = useListAdminServicesQuery({size: 100});
    const offices = (officePage?.content ?? []).filter(item => !direction || item.businessDirection === direction);
    const services = (servicePage?.content ?? []).filter(item => !direction || item.businessDirection === direction);
    const result = useListAdminBookingRecordsQuery({
        page, query, status, source, direction, officeId, resourceId, specialistId, serviceId, sort,
        visitFrom: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        visitTo: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined
    });
    const timeline = useGetAdminBookingTimelineQuery(selected?.id ?? 0, {skip: selected === null});
    const exportParams = new URLSearchParams({sort});
    if (status) exportParams.set("status", status);
    if (source) exportParams.set("source", source);
    if (direction) exportParams.set("direction", direction);
    if (query.trim()) exportParams.set("query", query.trim());
    if (from) exportParams.set("visitFrom", new Date(`${from}T00:00:00`).toISOString());
    if (to) exportParams.set("visitTo", new Date(`${to}T23:59:59.999`).toISOString());
    if (officeId) exportParams.set("officeId", String(officeId));
    if (resourceId) exportParams.set("resourceId", String(resourceId));
    if (specialistId) exportParams.set("specialistId", String(specialistId));
    if (serviceId) exportParams.set("serviceId", String(serviceId));
    const exportUrl = `${API_URL}/api/admin/records/bookings/export.csv?${exportParams.toString()}`;
    const dateTime = (value: string) => new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
    const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(locale, {style: "currency", currency: "UAH", maximumFractionDigits: 2}).format(value);
    const resetPage = () => setPage(0);

    return <section className="space-y-5">
        <header><p className="text-xs font-bold uppercase tracking-[.2em] text-stone-500">{t("eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold text-stone-950">{t("title")}</h1><p className="mt-2 max-w-3xl text-sm text-stone-600">{t("subtitle")}</p></header>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex w-fit rounded-xl bg-stone-200 p-1" role="tablist" aria-label={t("recordKindsLabel")}>
            {(["BOOKING", "TRAINING"] as const).map(kind => <button aria-selected={recordKind === kind} className={recordKind === kind ? "min-h-10 rounded-lg bg-white px-4 text-sm font-semibold text-stone-950 shadow-sm" : "min-h-10 rounded-lg px-4 text-sm font-semibold text-stone-600 hover:text-stone-950"} key={kind} onClick={() => setRecordKind(kind)} role="tab">{t(`recordKinds.${kind}`)}</button>)}
        </div>{recordKind === "BOOKING" && <a className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" href={exportUrl}>{t("exportCsv")}</a>}</div>
        {recordKind === "TRAINING" ? <TrainingRegistry /> : <>
        <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
            <label className="text-xs font-semibold text-stone-600 xl:col-span-2">{t("search")}<input className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" onChange={e => {setQuery(e.target.value); resetPage();}} placeholder={t("searchPlaceholder")} value={query}/></label>
            <Filter label={t("status")} value={status} onChange={value => {setStatus(value as BookingStatus | ""); resetPage();}} options={statuses.map(value => [value, t(`statuses.${value}`)])} all={t("all")} />
            <Filter label={t("source")} value={source} onChange={value => {setSource(value as BookingSource | ""); resetPage();}} options={sources.map(value => [value, t(`sources.${value}`)])} all={t("all")} />
            <Filter label={t("direction")} value={direction} onChange={value => {setDirection(value as "MASSAGE" | "TRAINING" | ""); resetPage();}} options={[["MASSAGE", t("directions.MASSAGE")], ["TRAINING", t("directions.TRAINING")]]} all={t("all")} />
            <div className="grid grid-cols-2 gap-2 xl:col-span-2"><DateFilter label={t("from")} value={from} onChange={value => {setFrom(value); resetPage();}}/><DateFilter label={t("to")} value={to} onChange={value => {setTo(value); resetPage();}}/></div>
            <details className="sm:col-span-2 xl:col-span-6">
                <summary className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-stone-700 hover:text-stone-950">{t("advancedFilters")}</summary>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <CatalogSelect label={t("office")} value={officeId} onChange={value => {setOfficeId(value); setResourceId(""); resetPage();}} options={offices.map(item => [item.id, item.name])} all={t("all")}/>
                    <CatalogSelect disabled={!officeId} label={t("resource")} value={resourceId} onChange={value => {setResourceId(value); resetPage();}} options={resources.map(item => [item.id, item.name])} all={t("all")}/>
                    <CatalogSelect label={t("specialist")} value={specialistId} onChange={value => {setSpecialistId(value); resetPage();}} options={(specialistPage?.content ?? []).map(item => [item.id, displayUser(item)])} all={t("all")}/>
                    <CatalogSelect label={t("service")} value={serviceId} onChange={value => {setServiceId(value); resetPage();}} options={services.map(item => [item.id, locale === "en" && item.titleEn ? item.titleEn : item.titleUa])} all={t("all")}/>
                    <label className="text-xs font-semibold text-stone-600">{t("sort")}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm" onChange={e => {setSort(e.target.value as typeof sort); resetPage();}} value={sort}>{(["startsAt,desc", "startsAt,asc", "createdAt,desc", "createdAt,asc"] as const).map(value => <option key={value} value={value}>{t(`sortOptions.${value.replace(",", "_")}`)}</option>)}</select></label>
                </div>
            </details>
        </div>
        {result.isLoading ? <p className="rounded-2xl bg-white p-6 text-stone-600">{t("loading")}</p> : result.isError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{t("error")}</p> : result.data?.content.length === 0 ? <p className="rounded-2xl bg-white p-6 text-stone-600">{t("empty")}</p> :
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="hidden grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(170px,1.3fr)_130px_120px] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-stone-500 md:grid"><span>{t("client")}</span><span>{t("specialist")}</span><span>{t("service")}</span><span>{t("visit")}</span><span>{t("status")}</span></div>
                {result.data?.content.map(record => <button className="grid w-full gap-2 border-b border-stone-100 px-4 py-4 text-left transition-colors last:border-0 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-900 md:grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(170px,1.3fr)_130px_120px] md:items-center" key={record.id} onClick={() => setSelected(record)}>
                    <span><strong className="block text-sm text-stone-950">{record.clientName}</strong><small className="text-stone-500">{record.clientContact || "—"}</small></span><span className="text-sm text-stone-700">{record.specialistName}</span><span><strong className="block text-sm text-stone-900">{locale === "en" && record.serviceTitleEn ? record.serviceTitleEn : record.serviceTitleUa}</strong><small className="text-stone-500">{record.officeName || "—"}{record.resourceName ? ` · ${record.resourceName}` : ""}</small></span><span className="text-sm text-stone-700">{dateTime(record.startsAt)}</span><span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">{t(`statuses.${record.status}`)}</span>
                </button>)}
            </div>}
        {result.data && result.data.totalPages > 1 && <div className="flex items-center justify-between"><button className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t("previous")}</button><span className="text-sm text-stone-600">{t("page", {current: page + 1, total: result.data.totalPages})}</span><button className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={page + 1 >= result.data.totalPages} onClick={() => setPage(value => value + 1)}>{t("next")}</button></div>}
        <Dialog closeLabel={t("close")} onClose={() => setSelected(null)} open={selected !== null} title={selected ? `${t("record")} #${selected.id}` : t("record")}>{selected && <><dl className="grid gap-4 text-sm sm:grid-cols-2"><Detail label={t("client")} value={`${selected.clientName} · ${selected.clientContact || "—"}`}/><Detail label={t("specialist")} value={selected.specialistName}/><Detail label={t("service")} value={locale === "en" && selected.serviceTitleEn ? selected.serviceTitleEn : selected.serviceTitleUa}/><Detail label={t("visit")} value={`${dateTime(selected.startsAt)} — ${dateTime(selected.endsAt)}`}/><Detail label={t("location")} value={[selected.officeName, selected.resourceName].filter(Boolean).join(" · ") || "—"}/><Detail label={t("source")} value={t(`sources.${selected.source}`)}/><Detail label={t("price")} value={`${money(selected.bookedPrice)} / ${money(selected.originalPrice)}`}/><Detail label={t("deposit")} value={money(selected.depositAmount)}/><Detail label={t("benefit")} value={selected.paidWithMembership ? t("membership") : selected.paidWithLoyaltyVoucher ? t("voucher") : selected.promoCode || "—"}/><Detail label={t("createdBy")} value={`${selected.createdByName} · ${dateTime(selected.createdAt)}`}/><Detail label={t("attendance")} value={selected.attendanceStatus ? t(`attendanceStatuses.${selected.attendanceStatus}`) : t("attendancePending")}/>{selected.cancellationReason && <Detail label={t("cancellation")} value={`${selected.cancellationReason}${selected.cancellationDetails ? ` · ${selected.cancellationDetails}` : ""}`}/>}</dl>{selected.status === "CONFIRMED" && new Date(selected.endsAt).getTime() <= Date.now() ? <div className="mt-5 flex flex-wrap gap-2"><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50" disabled={attendanceSaving} onClick={() => void setAttendance({id: selected.id, status: "ATTENDED"}).unwrap().then(() => setSelected({...selected, attendanceStatus: "ATTENDED", attendanceDecidedAt: new Date().toISOString(), attendanceDefaulted: false}))} type="button">{t("markAttended")}</button><button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50" disabled={attendanceSaving} onClick={() => void setAttendance({id: selected.id, status: "NO_SHOW"}).unwrap().then(() => setSelected({...selected, attendanceStatus: "NO_SHOW", attendanceDecidedAt: new Date().toISOString(), attendanceDefaulted: false}))} type="button">{t("markNoShow")}</button></div> : null}<Timeline loading={timeline.isLoading} entries={timeline.data ?? []} dateTime={dateTime} t={t}/></>}</Dialog>
        </>}
    </section>;
}

function Filter({label, value, onChange, options, all}: {label: string; value: string; onChange: (value: string) => void; options: string[][]; all: string}) { return <label className="text-xs font-semibold text-stone-600">{label}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm" onChange={e => onChange(e.target.value)} value={value}><option value="">{all}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function DateFilter({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) { return <label className="text-xs font-semibold text-stone-600">{label}<input className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-2 text-sm" onChange={e => onChange(e.target.value)} type="date" value={value}/></label>; }
function Detail({label, value}: {label: string; value: string}) { return <div><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 text-stone-900">{value}</dd></div>; }
function CatalogSelect({label, value, onChange, options, all, disabled = false}: {label: string; value: number | ""; onChange: (value: number | "") => void; options: Array<[number, string]>; all: string; disabled?: boolean}) { return <label className="text-xs font-semibold text-stone-600">{label}<select className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm disabled:bg-stone-100" disabled={disabled} onChange={e => onChange(e.target.value ? Number(e.target.value) : "")} value={value}><option value="">{all}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function displayUser(user: {firstName: string | null; lastName: string | null; email: string | null; phone: string | null}) { return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "—"; }
function Timeline({entries, loading, dateTime, t}: {entries: import("@/types/bookings").RecordAuditEntry[]; loading: boolean; dateTime: (value: string) => string; t: ReturnType<typeof useTranslations>}) { return <section className="mt-6 border-t border-stone-200 pt-5"><h3 className="text-sm font-semibold text-stone-950">{t("timeline")}</h3>{loading ? <p className="mt-3 text-sm text-stone-500">{t("loading")}</p> : <ol className="mt-3 space-y-3">{entries.map(entry => <li className="relative border-l-2 border-stone-200 pl-4 text-sm" key={entry.id}><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-stone-700"/><strong className="block text-stone-900">{t(`auditActions.${entry.action}`)}</strong><span className="text-stone-500">{dateTime(entry.occurredAt)} · {entry.actorName || t("systemActor")}</span></li>)}</ol>}</section>; }
