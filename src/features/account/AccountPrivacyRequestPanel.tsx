"use client";

import {useLocale} from "next-intl";
import {useState} from "react";
import {useCreatePrivacyRequestMutation, useOwnPrivacyRequestQuery} from "@/features/legal/legal.api";

export default function AccountPrivacyRequestPanel() {
    const ua = useLocale() === "ua";
    const current = useOwnPrivacyRequestQuery();
    const [create, state] = useCreatePrivacyRequestMutation();
    const [note, setNote] = useState("");
    return <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{ua ? "Видалення акаунта" : "Account deletion"}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">{ua ? "Перевіряються активні записи, незавершені оплати/повернення і зарезервовані переваги. Бізнес-історія не видаляється каскадно." : "Active bookings, unfinished payments/refunds, and reserved benefits are reviewed. Business history is never cascade-deleted."}</p>
        {current.data ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{ua ? "Статус запиту" : "Request status"}: <strong>{current.data.status}</strong>{current.data.decisionReason ? ` · ${current.data.decisionReason}` : ""}</p> : <><textarea className="mt-3 min-h-20 w-full rounded-lg border border-stone-300 p-3 text-sm" maxLength={1000} onChange={event => setNote(event.target.value)} placeholder={ua ? "Необов’язковий коментар" : "Optional note"} value={note}/><button className="mt-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={state.isLoading} onClick={() => void create({note: note.trim() || undefined})} type="button">{ua ? "Подати запит" : "Submit request"}</button></>}
    </section>;
}
