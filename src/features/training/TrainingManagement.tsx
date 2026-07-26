"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/ui/form/Input";
import Sheet from "@/components/ui/overlay/Sheet";
import Tabs from "@/components/ui/navigation/Tabs";
import EmptyState from "@/components/ui/state/EmptyState";
import LoadingState from "@/components/ui/state/LoadingState";
import ErrorState from "@/components/ui/state/ErrorState";
import StatusBadge from "@/components/ui/state/StatusBadge";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useListUsersQuery} from "@/features/users/users.api";
import {useListOfficeResourcesQuery, useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {useCreateTrainingSessionMutation, useCreateTrainingTypeMutation, useListTrainingSessionsQuery, useListTrainingTypesQuery, useUpdateTrainingSessionMutation, useUpdateTrainingTypeMutation} from "./training.api";
import {formatWholeCurrencyAmount} from "@/shared/lib/i18n/formatNumbers";
import type {TrainingSession, TrainingSessionInput, TrainingType, TrainingTypeInput} from "@/types/training";

const emptyType: TrainingTypeInput = {titleUa: "", descriptionUa: null, titleEn: null, descriptionEn: null, durationMinutes: 90, price: 0, depositAmount: 0, defaultCapacity: 8, active: true, trainerIds: []};
const emptySession: TrainingSessionInput = {trainingTypeId: 0, trainerId: 0, officeId: 0, resourceId: 0, startsAt: "", capacity: null, status: "DRAFT", note: null};

export default function TrainingManagement() {
    const t = useTranslations("admin.training");
    const toast = useToast();
    const [tab, setTab] = useState<"types" | "sessions">("types");
    const [editing, setEditing] = useState<TrainingType | "new" | null>(null);
    const [form, setForm] = useState<TrainingTypeInput>(emptyType);
    const [editingSession, setEditingSession] = useState<TrainingSession | "new" | null>(null);
    const [sessionForm, setSessionForm] = useState<TrainingSessionInput>(emptySession);
    const {data: types = [], isLoading, isError, refetch} = useListTrainingTypesQuery();
    const {data: users} = useListUsersQuery({role: "SPECIALIST", enabled: true, size: 100});
    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const {data: resources = []} = useListOfficeResourcesQuery(sessionForm.officeId, {skip: !sessionForm.officeId});
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();
    const {data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions} = useListTrainingSessionsQuery({from, to});
    const [createType, {isLoading: creating}] = useCreateTrainingTypeMutation();
    const [updateType, {isLoading: updating}] = useUpdateTrainingTypeMutation();
    const [createSession, {isLoading: creatingSession}] = useCreateTrainingSessionMutation();
    const [updateSession, {isLoading: updatingSession}] = useUpdateTrainingSessionMutation();

    useEffect(() => {
        if (editing === "new") setForm({...emptyType});
        else if (editing) setForm({titleUa: editing.titleUa, descriptionUa: editing.descriptionUa, titleEn: editing.titleEn, descriptionEn: editing.descriptionEn, durationMinutes: editing.durationMinutes, price: editing.price, depositAmount: editing.depositAmount, defaultCapacity: editing.defaultCapacity, active: editing.active, trainerIds: editing.trainerIds});
    }, [editing]);

    useEffect(() => {
        if (editingSession === "new") {
            const startsAt = new Date();
            startsAt.setDate(startsAt.getDate() + 1);
            startsAt.setHours(10, 0, 0, 0);
            setSessionForm({...emptySession, trainingTypeId: types[0]?.id ?? 0, startsAt: toLocalDateTime(startsAt)});
        } else if (editingSession) {
            setSessionForm({trainingTypeId: editingSession.trainingTypeId, trainerId: editingSession.trainerId, officeId: editingSession.officeId, resourceId: editingSession.resourceId, startsAt: toLocalDateTime(new Date(editingSession.startsAt)), capacity: editingSession.capacity, status: editingSession.status, note: editingSession.note});
        }
    }, [editingSession, types]);

    async function save() {
        try {
            if (editing === "new") await createType(form).unwrap();
            else if (editing) await updateType({id: editing.id, body: form}).unwrap();
            toast.success(t("saved"));
            setEditing(null);
        } catch {
            toast.error(t("saveError"));
        }
    }

    async function saveSession() {
        const body = {...sessionForm, startsAt: new Date(sessionForm.startsAt).toISOString()};
        try {
            if (editingSession === "new") await createSession(body).unwrap();
            else if (editingSession) await updateSession({id: editingSession.id, body}).unwrap();
            toast.success(t("sessionSaved"));
            setEditingSession(null);
        } catch {
            toast.error(t("sessionSaveError"));
        }
    }

    return (
        <section className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t("eyebrow")}</p><h1 className="mt-1 text-2xl font-semibold text-stone-950">{t("title")}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{t("subtitle")}</p></div>
                {tab === "types" ? <Button onClick={() => setEditing("new")}>{t("newType")}</Button> : <Button disabled={types.length === 0} onClick={() => setEditingSession("new")}>{t("newSession")}</Button>}
            </header>
            <Tabs label={t("tabsLabel")} onChange={setTab} options={[{value: "types", label: t("types")}, {value: "sessions", label: t("sessions")}] } value={tab} />
            {tab === "types" ? (
                isLoading ? <LoadingState label={t("loading")} /> : isError ? <ErrorState action={<Button onClick={() => void refetch()} variant="secondary">{t("retry")}</Button>} description={t("loadError")} title={t("loadError")} /> : types.length === 0 ? <EmptyState description={t("emptyTypes")} title={t("types")} /> :
                    <div className="grid gap-3 xl:grid-cols-2">{types.map((type) => <button className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-stone-400 hover:shadow-md" key={type.id} onClick={() => setEditing(type)} type="button"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-stone-950">{type.titleUa}</h2><p className="mt-1 text-sm text-stone-500">{type.durationMinutes} {t("minutes")} · {formatWholeCurrencyAmount(type.price, "ua")}</p></div><StatusBadge tone={type.active ? "success" : "neutral"}>{type.active ? t("active") : t("inactive")}</StatusBadge></div><p className="mt-3 text-xs text-stone-500">{t("capacity", {count: type.defaultCapacity})} · {t("trainers", {count: type.trainerIds.length})}</p></button>)}</div>
            ) : sessionsLoading ? <LoadingState label={t("loading")} /> : sessionsError ? <ErrorState action={<Button onClick={() => void refetchSessions()} variant="secondary">{t("retry")}</Button>} description={t("loadError")} title={t("loadError")} /> : sessions.length === 0 ? <EmptyState description={t("emptySessions")} title={t("sessions")} /> :
                <div className="space-y-2">{sessions.map((session) => <button className="block w-full rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-stone-400 hover:shadow-sm" key={session.id} onClick={() => setEditingSession(session)} type="button"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-stone-950">{session.titleUa}</h2><p className="mt-1 text-sm text-stone-500">{new Date(session.startsAt).toLocaleString()} · {session.trainerName}</p><p className="mt-1 text-xs text-stone-500">{session.officeName} · {session.resourceName} · {t("capacity", {count: session.capacity})}</p></div><StatusBadge tone={session.status === "PUBLISHED" ? "success" : session.status === "DRAFT" ? "info" : "neutral"}>{t(`status.${session.status}`)}</StatusBadge></div></button>)}</div>}
            <Sheet closeLabel={t("close")} onClose={() => setEditing(null)} open={editing !== null} title={editing === "new" ? t("newType") : t("editType")} footer={<><Button onClick={() => setEditing(null)} variant="secondary">{t("cancel")}</Button><Button disabled={creating || updating || !form.titleUa.trim() || form.durationMinutes < 1 || form.price < 0 || form.depositAmount > form.price} onClick={save}>{t("save")}</Button></>}>
                <div className="space-y-4"><TrainingField label={t("titleUa")}><Input onChange={(event) => setForm(current => ({...current, titleUa: event.target.value}))} value={form.titleUa} /></TrainingField><TrainingField label={t("titleEn")}><Input onChange={(event) => setForm(current => ({...current, titleEn: event.target.value || null}))} value={form.titleEn ?? ""} /></TrainingField><TrainingField label={t("descriptionUa")}><textarea className={textareaClass} onChange={(event) => setForm(current => ({...current, descriptionUa: event.target.value || null}))} value={form.descriptionUa ?? ""} /></TrainingField><div className="grid grid-cols-2 gap-3"><NumberField label={t("duration")} onChange={(durationMinutes) => setForm(current => ({...current, durationMinutes}))} value={form.durationMinutes} /><NumberField label={t("capacityLabel")} onChange={(defaultCapacity) => setForm(current => ({...current, defaultCapacity}))} value={form.defaultCapacity} /><NumberField label={t("price")} onChange={(price) => setForm(current => ({...current, price}))} value={form.price} /><NumberField label={t("deposit")} onChange={(depositAmount) => setForm(current => ({...current, depositAmount}))} value={form.depositAmount} /></div><div><p className="text-sm font-medium text-stone-800">{t("eligibleTrainers")}</p><div className="mt-2 space-y-2">{(users?.content ?? []).map(user => <label className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm" key={user.id}><input checked={form.trainerIds.includes(user.id)} onChange={(event) => setForm(current => ({...current, trainerIds: event.target.checked ? [...current.trainerIds, user.id] : current.trainerIds.filter(id => id !== user.id)}))} type="checkbox" />{[user.firstName, user.lastName].filter(Boolean).join(" ")}</label>)}</div></div><label className="flex items-center gap-2 text-sm font-medium"><input checked={form.active} onChange={(event) => setForm(current => ({...current, active: event.target.checked}))} type="checkbox" />{t("active")}</label></div>
            </Sheet>
            <Sheet closeLabel={t("close")} onClose={() => setEditingSession(null)} open={editingSession !== null} title={editingSession === "new" ? t("newSession") : t("editSession")} footer={<><Button onClick={() => setEditingSession(null)} variant="secondary">{t("cancel")}</Button><Button disabled={creatingSession || updatingSession || !sessionForm.trainingTypeId || !sessionForm.trainerId || !sessionForm.officeId || !sessionForm.resourceId || !sessionForm.startsAt} onClick={saveSession}>{t("save")}</Button></>}>
                <div className="space-y-4">
                    <SelectField label={t("trainingType")} onChange={(trainingTypeId) => setSessionForm(current => ({...current, trainingTypeId, trainerId: 0, capacity: types.find(type => type.id === trainingTypeId)?.defaultCapacity ?? null}))} value={sessionForm.trainingTypeId}>{types.filter(type => type.active || type.id === sessionForm.trainingTypeId).map(type => <option key={type.id} value={type.id}>{type.titleUa} · {type.durationMinutes} {t("minutes")}</option>)}</SelectField>
                    <SelectField label={t("trainer")} onChange={(trainerId) => setSessionForm(current => ({...current, trainerId}))} value={sessionForm.trainerId}><option value={0}>{t("select")}</option>{(users?.content ?? []).filter(user => {const type = types.find(item => item.id === sessionForm.trainingTypeId); return !type || type.trainerIds.length === 0 || type.trainerIds.includes(user.id);}).map(user => <option key={user.id} value={user.id}>{[user.firstName, user.lastName].filter(Boolean).join(" ")}</option>)}</SelectField>
                    <SelectField label={t("office")} onChange={(officeId) => setSessionForm(current => ({...current, officeId, resourceId: 0}))} value={sessionForm.officeId}><option value={0}>{t("select")}</option>{(officesData?.content ?? []).filter(office => office.active && office.businessDirection === "TRAINING").map(office => <option key={office.id} value={office.id}>{office.name}</option>)}</SelectField>
                    <SelectField label={t("hall")} onChange={(resourceId) => setSessionForm(current => ({...current, resourceId}))} value={sessionForm.resourceId}><option value={0}>{t("select")}</option>{resources.filter(resource => resource.active).map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</SelectField>
                    <TrainingField label={t("startsAt")}><Input onChange={(event) => setSessionForm(current => ({...current, startsAt: event.target.value}))} type="datetime-local" value={sessionForm.startsAt} /></TrainingField>
                    <NumberField label={t("capacityLabel")} onChange={(capacity) => setSessionForm(current => ({...current, capacity}))} value={sessionForm.capacity ?? 1} />
                    <TrainingField label={t("sessionStatus")}><select className={selectClass} onChange={(event) => setSessionForm(current => ({...current, status: event.target.value as TrainingSessionInput["status"]}))} value={sessionForm.status}><option value="DRAFT">{t("status.DRAFT")}</option><option value="PUBLISHED">{t("status.PUBLISHED")}</option><option value="CANCELLED">{t("status.CANCELLED")}</option></select></TrainingField>
                    <TrainingField label={t("note")}><textarea className={textareaClass} onChange={(event) => setSessionForm(current => ({...current, note: event.target.value || null}))} value={sessionForm.note ?? ""} /></TrainingField>
                </div>
            </Sheet>
        </section>
    );
}

const textareaClass = "min-h-28 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-900/15";
const selectClass = "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-900/15";
function TrainingField({label, children}: {label: string; children: React.ReactNode}) {return <label className="block text-sm font-medium text-stone-800">{label}<span className="mt-1 block">{children}</span></label>;}
function NumberField({label, value, onChange}: {label: string; value: number; onChange: (value: number) => void}) {return <TrainingField label={label}><Input min={0} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} /></TrainingField>;}
function SelectField({label, value, onChange, children}: {label: string; value: number; onChange: (value: number) => void; children: React.ReactNode}) {return <TrainingField label={label}><select className={selectClass} onChange={(event) => onChange(Number(event.target.value))} value={value}>{children}</select></TrainingField>;}
function toLocalDateTime(date: Date) {const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16);}
