"use client";

import {useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Sheet from "@/components/ui/overlay/Sheet";
import Field from "@/components/ui/form/Field";
import {useListUsersQuery} from "@/features/users/users.api";
import {useListPublicOfficesQuery, useListOfficeResourcesQuery} from "@/features/offices/offices.api";
import {useBulkCopyWorkScheduleMutation, useCreateWorkScheduleMutation, useDeleteWorkScheduleMutation, useListWorkScheduleQuery, useUpdateWorkScheduleMutation} from "./workSchedule.api";
import type {WorkScheduleEntry, WorkScheduleEntryInput, WorkScheduleEntryType} from "@/types/workSchedule";

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-200";

export default function WorkScheduleManagement() {
    const t = useTranslations("admin.workSchedule");
    const locale = useLocale();
    const [anchorDate, setAnchorDate] = useState(() => new Date());
    const [view, setView] = useState<"week" | "month">("week");
    const [specialistId, setSpecialistId] = useState<number | "">("");
    const [officeId, setOfficeId] = useState<number | "">("");
    const [editing, setEditing] = useState<WorkScheduleEntry | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [copyOpen, setCopyOpen] = useState(false);
    const periodStart = view === "week" ? startOfWeek(anchorDate) : startOfMonth(anchorDate);
    const periodEnd = view === "week" ? addDays(periodStart, 7) : startOfMonth(addMonths(periodStart, 1));
    const days = Array.from({length: dayDifference(periodStart, periodEnd)}, (_, index) => addDays(periodStart, index));
    const range = {from: periodStart.toISOString(), to: periodEnd.toISOString(), specialistId, officeId};
    const {data: entries = [], isFetching, isError} = useListWorkScheduleQuery(range);
    const {data: usersData} = useListUsersQuery({role: "SPECIALIST", enabled: true, size: 100});
    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const specialists = usersData?.content ?? [];
    const offices = officesData?.content ?? [];
    const visibleSpecialists = specialistId ? specialists.filter((item) => item.id === specialistId) : specialists;

    function openCreate() { setEditing(null); setDrawerOpen(true); }
    function openEdit(entry: WorkScheduleEntry) { setEditing(entry); setDrawerOpen(true); }

    return <section className="min-w-0 space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl bg-stone-950 px-5 py-6 text-white sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-stone-400">{t("eyebrow")}</p><h1 className="mt-2 text-2xl font-semibold">{t("title")}</h1><p className="mt-2 max-w-2xl text-sm text-stone-300">{t("intro")}</p></div>
            <div className="flex flex-wrap gap-2 print:hidden"><Button onClick={() => window.print()} variant="secondary">{t("print")}</Button><Button onClick={() => setCopyOpen(true)} variant="secondary">{t("bulkCopy")}</Button><Button onClick={openCreate}>{t("add")}</Button></div>
        </header>
        <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 print:hidden sm:grid-cols-[1fr_1fr_auto]">
            <select aria-label={t("specialist")} className={inputClass} onChange={(event) => setSpecialistId(event.target.value ? Number(event.target.value) : "")} value={specialistId}><option value="">{t("allSpecialists")}</option>{specialists.map((item) => <option key={item.id} value={item.id}>{userName(item)}</option>)}</select>
            <select aria-label={t("office")} className={inputClass} onChange={(event) => setOfficeId(event.target.value ? Number(event.target.value) : "")} value={officeId}><option value="">{t("allOffices")}</option>{offices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <div className="flex flex-wrap gap-2"><Button onClick={() => setAnchorDate(view === "week" ? addDays(anchorDate, -7) : addMonths(anchorDate, -1))} variant="secondary">←</Button><Button onClick={() => setAnchorDate(new Date())} variant="secondary">{t("today")}</Button><Button onClick={() => setAnchorDate(view === "week" ? addDays(anchorDate, 7) : addMonths(anchorDate, 1))} variant="secondary">→</Button><Button onClick={() => setView(view === "week" ? "month" : "week")} variant="secondary">{view === "week" ? t("month") : t("week")}</Button></div>
        </div>
        {isError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("error")}</p> : null}
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <div className="grid min-w-max" style={{gridTemplateColumns: `190px repeat(${days.length}, minmax(110px, 1fr))`}}>
                <div className="sticky left-0 z-10 border-b border-r border-stone-200 bg-stone-50 p-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{isFetching ? t("loading") : t("specialist")}</div>
                {days.map((day) => <div className="border-b border-r border-stone-200 bg-stone-50 p-3 text-center text-xs font-semibold text-stone-700" key={day.toISOString()}>{new Intl.DateTimeFormat(locale, {weekday: "short", day: "2-digit", month: "2-digit"}).format(day)}</div>)}
                {visibleSpecialists.map((specialist) => <div className="contents" key={specialist.id}>
                    <div className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white p-3 text-sm font-semibold text-stone-900">{userName(specialist)}</div>
                    {days.map((day) => <div className="min-h-24 space-y-2 border-b border-r border-stone-200 p-2" key={day.toISOString()}>{entries.filter((entry) => entry.specialistId === specialist.id && sameDay(new Date(entry.startsAt), day)).map((entry) => <button className={`w-full rounded-lg border p-2 text-left text-xs transition hover:-translate-y-0.5 hover:shadow-sm ${tone(entry.entryType)}`} key={entry.id} onClick={() => openEdit(entry)} type="button"><span className="block font-semibold">{t(`types.${entry.entryType}`)}</span><span className="mt-1 block">{timeRange(entry, locale)}</span><span className="mt-1 block truncate text-stone-600">{entry.resourceName ?? entry.notes}</span></button>)}</div>)}
                </div>)}
            </div>
        </div>
        <EntrySheet close={() => setDrawerOpen(false)} editing={editing} key={`${editing?.id ?? "new"}-${drawerOpen}`} offices={offices} open={drawerOpen} specialists={specialists} t={t} />
        <BulkCopySheet close={() => setCopyOpen(false)} open={copyOpen} specialists={specialists} t={t} />
    </section>;
}

function BulkCopySheet({open, close, specialists, t}: {open:boolean;close:()=>void;specialists:Array<{id:number;firstName?:string|null;lastName?:string|null;phone?:string|null}>;t:ReturnType<typeof useTranslations>}) {
    const [copy, state] = useBulkCopyWorkScheduleMutation();
    const [specialistId,setSpecialistId]=useState(specialists[0]?.id??0); const [sourceDate,setSourceDate]=useState(isoDate(new Date())); const [targets,setTargets]=useState(isoDate(addDays(new Date(),7)));
    async function submit(){const targetDates=targets.split(/[\s,;]+/).map(value=>value.trim()).filter(Boolean);await copy({specialistId,sourceDate,targetDates}).unwrap();close();}
    return <Sheet closeLabel={t("close")} footer={<><Button onClick={close} variant="secondary">{t("cancel")}</Button><Button disabled={state.isLoading||!specialistId||!sourceDate||!targets.trim()} onClick={submit}>{t("copyAction")}</Button></>} onClose={close} open={open} title={t("bulkCopy")}><div className="space-y-4"><p className="text-sm leading-6 text-stone-600">{t("bulkCopyHint")}</p><Field htmlFor="copy-specialist" label={t("specialist")}><select className={inputClass} id="copy-specialist" onChange={e=>setSpecialistId(Number(e.target.value))} value={specialistId}>{specialists.map(item=><option key={item.id} value={item.id}>{userName(item)}</option>)}</select></Field><Field htmlFor="copy-source" label={t("sourceDate")}><input className={inputClass} id="copy-source" onChange={e=>setSourceDate(e.target.value)} type="date" value={sourceDate}/></Field><Field hint={t("targetDatesHint")} htmlFor="copy-targets" label={t("targetDates")}><textarea className={inputClass} id="copy-targets" onChange={e=>setTargets(e.target.value)} rows={4} value={targets}/></Field></div></Sheet>;
}

function EntrySheet({open, close, editing, specialists, offices, t}: {open: boolean; close: () => void; editing: WorkScheduleEntry | null; specialists: Array<{id:number; firstName?:string|null; lastName?:string|null; phone?:string|null}>; offices: Array<{id:number; name:string}>; t: ReturnType<typeof useTranslations>}) {
    const [create, createState] = useCreateWorkScheduleMutation(); const [update, updateState] = useUpdateWorkScheduleMutation(); const [remove, removeState] = useDeleteWorkScheduleMutation();
    const [type, setType] = useState<WorkScheduleEntryType>(editing?.entryType ?? "WORKING");
    const [specialistId, setSpecialistId] = useState(editing?.specialistId ?? specialists[0]?.id ?? 0);
    const [officeId, setOfficeId] = useState(editing?.officeId ?? offices[0]?.id ?? 0);
    const {data: resources = []} = useListOfficeResourcesQuery(officeId, {skip: !officeId || type !== "WORKING"});
    const [resourceId, setResourceId] = useState(editing?.resourceId ?? 0);
    const [startsAt, setStartsAt] = useState(toLocalInput(editing?.startsAt)); const [endsAt, setEndsAt] = useState(toLocalInput(editing?.endsAt)); const [notes, setNotes] = useState(editing?.notes ?? "");
    const busy = createState.isLoading || updateState.isLoading || removeState.isLoading;
    async function save() { const body: WorkScheduleEntryInput = {specialistId, entryType:type, officeId:type === "WORKING" ? officeId : null, resourceId:type === "WORKING" ? resourceId : null, startsAt:new Date(startsAt).toISOString(), endsAt:new Date(endsAt).toISOString(), notes:notes || null}; if (editing) await update({id:editing.id, body}).unwrap(); else await create(body).unwrap(); close(); }
    return <Sheet closeLabel={t("close")} footer={<><Button onClick={close} variant="secondary">{t("cancel")}</Button>{editing ? <Button disabled={busy} onClick={async () => {await remove(editing.id).unwrap(); close();}} variant="danger">{t("delete")}</Button> : null}<Button disabled={busy || !specialistId || !startsAt || !endsAt || (type === "WORKING" && (!officeId || !resourceId))} onClick={save}>{t("save")}</Button></>} onClose={close} open={open} title={editing ? t("edit") : t("add")}>
        <div className="space-y-4"><Field htmlFor="ws-specialist" label={t("specialist")}><select className={inputClass} id="ws-specialist" onChange={(e)=>setSpecialistId(Number(e.target.value))} value={specialistId}>{specialists.map(item=><option key={item.id} value={item.id}>{userName(item)}</option>)}</select></Field><Field htmlFor="ws-type" label={t("type")}><select className={inputClass} id="ws-type" onChange={(e)=>setType(e.target.value as WorkScheduleEntryType)} value={type}>{(["WORKING","DAY_OFF","VACATION","ABSENCE"] as const).map(item=><option key={item} value={item}>{t(`types.${item}`)}</option>)}</select></Field>{type === "WORKING" ? <><Field htmlFor="ws-office" label={t("office")}><select className={inputClass} id="ws-office" onChange={(e)=>{setOfficeId(Number(e.target.value));setResourceId(0);}} value={officeId}>{offices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field htmlFor="ws-resource" label={t("resource")}><select className={inputClass} id="ws-resource" onChange={(e)=>setResourceId(Number(e.target.value))} value={resourceId}><option value="">{t("selectResource")}</option>{resources.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></> : null}<Field htmlFor="ws-start" label={t("startsAt")}><input className={inputClass} id="ws-start" onChange={(e)=>setStartsAt(e.target.value)} type="datetime-local" value={startsAt}/></Field><Field htmlFor="ws-end" label={t("endsAt")}><input className={inputClass} id="ws-end" onChange={(e)=>setEndsAt(e.target.value)} type="datetime-local" value={endsAt}/></Field><Field htmlFor="ws-notes" label={t("notes")}><textarea className={inputClass} id="ws-notes" maxLength={500} onChange={(e)=>setNotes(e.target.value)} value={notes}/></Field></div>
    </Sheet>;
}

function startOfWeek(date: Date) { const value = new Date(date); const day = (value.getDay()+6)%7; value.setDate(value.getDate()-day); value.setHours(0,0,0,0); return value; }
function addDays(date: Date, days: number) { const value = new Date(date); value.setDate(value.getDate()+days); return value; }
function addMonths(date: Date, months: number) { const value = new Date(date); value.setMonth(value.getMonth()+months); return value; }
function startOfMonth(date: Date) { const value = new Date(date.getFullYear(),date.getMonth(),1); value.setHours(0,0,0,0); return value; }
function dayDifference(from:Date,to:Date){return Math.round((to.getTime()-from.getTime())/86_400_000);}
function isoDate(date:Date){return date.toISOString().slice(0,10);}
function sameDay(a: Date,b: Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function userName(user:{id:number;firstName?:string|null;lastName?:string|null;phone?:string|null}){return [user.firstName,user.lastName].filter(Boolean).join(" ")||user.phone||`#${user.id}`;}
function tone(type:WorkScheduleEntryType){return type==="WORKING"?"border-emerald-200 bg-emerald-50":type==="VACATION"?"border-sky-200 bg-sky-50":"border-stone-300 bg-stone-100";}
function timeRange(entry:WorkScheduleEntry,locale:string){const f=new Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit"});return `${f.format(new Date(entry.startsAt))}–${f.format(new Date(entry.endsAt))}`;}
function toLocalInput(value?:string){const date=value?new Date(value):new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16);}
