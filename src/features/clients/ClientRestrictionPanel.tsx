"use client";

import {useState} from "react";
import type {ClientSummary} from "@/types/clients";
import {useAddRestrictionMutation, useListRestrictionsQuery, useRemoveRestrictionMutation} from "./clients.api";

export default function ClientRestrictionPanel({client, locale}: {client: ClientSummary; locale: string}) {
    const {data = []} = useListRestrictionsQuery(client.id);
    const [reason, setReason] = useState("");
    const [add, addState] = useAddRestrictionMutation();
    const [remove, removeState] = useRemoveRestrictionMutation();
    const restricted = data[0]?.action === "ADDED";
    const ua = locale === "ua";
    const warning = client.noShowCount >= 3 || client.lateCancellationCount >= 3;

    async function submit() {
        if (!reason.trim()) return;
        if (restricted) await remove({id: client.id, reason: reason.trim()}).unwrap();
        else await add({id: client.id, reason: reason.trim()}).unwrap();
        setReason("");
    }

    return <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold text-stone-950">{ua ? "Обмеження self-booking" : "Self-booking restriction"}</h3><p className="mt-1 text-xs text-stone-600">{ua ? "Не впливає на login, history або messages." : "Does not affect login, history, or messages."}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${restricted ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{restricted ? (ua ? "Активне безстроково" : "Active indefinitely") : (ua ? "Немає" : "None")}</span>
        </div>
        <div className={`mt-3 grid gap-2 rounded-lg p-3 text-sm ${warning ? "bg-amber-100 text-amber-950" : "bg-white text-stone-700"} sm:grid-cols-2`}><span>NO_SHOW: <strong>{client.noShowCount}</strong>{client.noShowCount >= 3 ? " · warning" : ""}</span><span>{ua ? "Пізні скасування" : "Late cancellations"}: <strong>{client.lateCancellationCount}</strong>{client.lateCancellationCount >= 3 ? " · warning" : ""}</span></div>
        <textarea className="mt-3 min-h-20 w-full rounded-lg border border-stone-300 bg-white p-3 text-sm" maxLength={500} onChange={event => setReason(event.target.value)} placeholder={ua ? "Обов’язкова причина" : "Required reason"} value={reason}/>
        <button className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 ${restricted ? "bg-emerald-700" : "bg-red-700"}`} disabled={!reason.trim() || addState.isLoading || removeState.isLoading} onClick={() => void submit()} type="button">{restricted ? (ua ? "Зняти обмеження" : "Remove restriction") : (ua ? "Додати до blacklist" : "Add to blacklist")}</button>
        <div className="mt-4 space-y-2">{data.map(event => <article className="rounded-lg border border-stone-200 bg-white p-3 text-xs" key={event.id}><strong>{event.action}</strong><p className="mt-1 text-stone-700">{event.reason}</p><p className="mt-1 text-stone-500">{new Date(event.occurredAt).toLocaleString(locale)} · ADMIN #{event.actorUserId}</p></article>)}</div>
    </section>;
}
