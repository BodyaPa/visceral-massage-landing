"use client";

import {useState} from "react";
import {useLocale} from "next-intl";
import {type LegalDocumentType, useCompletePrivacyRequestMutation, useCreateLegalDraftMutation, useLazyPrivacyPreviewQuery, useLegalVersionsQuery, usePrivacyRequestsQuery, usePublishLegalVersionMutation, useRejectPrivacyRequestMutation, useUpdateLegalDraftMutation} from "./legal.api";

const types: LegalDocumentType[] = ["BOOKING_TERMS", "CANCELLATION_REFUND", "PRIVACY_POLICY"];

export default function LegalManagement() {
    const ua = useLocale() === "ua";
    const [type, setType] = useState<LegalDocumentType>("BOOKING_TERMS");
    const versions = useLegalVersionsQuery(type);
    const privacy = usePrivacyRequestsQuery();
    const [create, createState] = useCreateLegalDraftMutation();
    const [update, updateState] = useUpdateLegalDraftMutation();
    const [publish] = usePublishLegalVersionMutation();
    const [preview, previewState] = useLazyPrivacyPreviewQuery();
    const [complete] = useCompletePrivacyRequestMutation();
    const [reject] = useRejectPrivacyRequestMutation();
    const [titleUa, setTitleUa] = useState("");
    const [titleEn, setTitleEn] = useState("");
    const [contentUa, setContentUa] = useState("");
    const [contentEn, setContentEn] = useState("");
    const [reason, setReason] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);

    async function createDraft() {
        const body = {titleUa, titleEn, contentUa, contentEn};
        if (editingId) await update({id: editingId, body}).unwrap();
        else await create({type, body}).unwrap();
        setEditingId(null);
        setTitleUa(""); setTitleEn(""); setContentUa(""); setContentEn("");
    }

    return <div className="space-y-6">
        <header><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{ua ? "Правові документи й приватність" : "Legal & privacy"}</p><h1 className="mt-1 text-2xl font-semibold">{ua ? "Незмінні правові версії" : "Immutable legal versions"}</h1></header>
        <section className="rounded-xl border border-stone-200 bg-white p-4">
            <select className="rounded-lg border border-stone-300 bg-white px-3 py-2" value={type} onChange={event => setType(event.target.value as LegalDocumentType)}>{types.map(item => <option key={item}>{item}</option>)}</select>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="rounded-lg border p-3" placeholder="Title UA" value={titleUa} onChange={event => setTitleUa(event.target.value)}/><input className="rounded-lg border p-3" placeholder="Title EN" value={titleEn} onChange={event => setTitleEn(event.target.value)}/><textarea className="min-h-32 rounded-lg border p-3" placeholder="Content UA" value={contentUa} onChange={event => setContentUa(event.target.value)}/><textarea className="min-h-32 rounded-lg border p-3" placeholder="Content EN" value={contentEn} onChange={event => setContentEn(event.target.value)}/></div>
            <button className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-40" disabled={createState.isLoading || updateState.isLoading || !titleUa.trim() || !titleEn.trim() || !contentUa.trim() || !contentEn.trim()} onClick={() => void createDraft()} type="button">{editingId ? (ua ? "Оновити чернетку" : "Update draft") : (ua ? "Створити чернетку" : "Create draft")}</button>
            <div className="mt-5 space-y-2">{(versions.data ?? []).map(version => <article className="rounded-lg border border-stone-200 p-3" key={version.id}><div className="flex flex-wrap justify-between gap-2"><strong>v{version.versionNumber} · {version.status}</strong>{version.status === "DRAFT" ? <span className="flex gap-2"><button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => {setEditingId(version.id);setTitleUa(version.titleUa);setTitleEn(version.titleEn);setContentUa(version.contentUa);setContentEn(version.contentEn)}} type="button">{ua ? "Редагувати чернетку" : "Edit draft"}</button><button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white" onClick={() => void publish(version.id)} type="button">{ua ? "Опублікувати незмінну версію" : "Publish immutable version"}</button></span> : null}</div><p className="mt-2 text-sm">{version.titleUa} / {version.titleEn}</p></article>)}</div>
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold">{ua ? "Запити на видалення акаунта" : "Account privacy requests"}</h2>
            <textarea className="mt-3 min-h-20 w-full rounded-lg border p-3" placeholder={ua ? "Обов’язкова причина рішення ADMIN" : "Mandatory ADMIN decision reason"} value={reason} onChange={event => setReason(event.target.value)}/>
            <div className="mt-4 space-y-3">{(privacy.data ?? []).map(request => <article className="rounded-lg border border-stone-200 p-3" key={request.id}><strong>Client #{request.clientProfileId} · {request.status}</strong><p className="mt-1 text-sm text-stone-600">{request.requestNote || "No request note"}</p><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void preview(request.id)} type="button">Dependency preview</button><button className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-40" disabled={!reason.trim()} onClick={() => void complete({id: request.id, reason: reason.trim()})} type="button">Complete / mark blocked</button><button className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-40" disabled={!reason.trim()} onClick={() => void reject({id: request.id, reason: reason.trim()})} type="button">Reject</button></div>{previewState.originalArgs === request.id && previewState.data ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Active: {previewState.data.activeBookings}; payments/refunds: {previewState.data.unfinishedPaymentsOrRefunds}; reserved benefits: {previewState.data.reservedBenefits}; can complete: {String(previewState.data.canComplete)}</p> : null}</article>)}</div>
        </section>
    </div>;
}
