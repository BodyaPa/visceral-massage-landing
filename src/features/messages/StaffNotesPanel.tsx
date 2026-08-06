"use client";

import {FormEvent, useState} from "react";
import {useAddStaffNoteMutation, useLazyListStaffNotesQuery} from "./messages.api";

export default function StaffNotesPanel() {
  const [sourceType, setSourceType] = useState("BOOKING");
  const [sourceId, setSourceId] = useState("");
  const [body, setBody] = useState("");
  const [load, notes] = useLazyListStaffNotesQuery();
  const [addNote, addState] = useAddStaffNoteMutation();

  const validSourceId = Number(sourceId) > 0 ? Number(sourceId) : null;

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!validSourceId || !body.trim()) return;
    await addNote({sourceType, sourceId: validSourceId, text: body.trim()}).unwrap();
    setBody("");
    await load({sourceType, sourceId: validSourceId}, false);
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Staff-only notes</h2>
      <p className="mt-1 text-sm text-stone-500">These notes are separate from customer-visible messages.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="rounded-lg border border-stone-300 bg-white px-3 py-2" value={sourceType} onChange={event => setSourceType(event.target.value)}>
          <option value="BOOKING">Booking</option>
          <option value="TRAINING_PARTICIPANT">Training participant</option>
          <option value="TRAINING_SESSION">Training session</option>
        </select>
        <input className="w-40 rounded-lg border border-stone-300 px-3 py-2" min="1" placeholder="Record ID" type="number" value={sourceId} onChange={event => setSourceId(event.target.value)}/>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50" disabled={!validSourceId} onClick={() => validSourceId && void load({sourceType, sourceId: validSourceId}, false)} type="button">Load notes</button>
      </div>
      <div className="mt-4 space-y-2">
        {(notes.data ?? []).map(note => <article className="rounded-lg bg-stone-50 p-3 text-sm" key={note.id}><p>{note.text}</p><p className="mt-1 text-xs text-stone-500">{new Date(note.createdAt).toLocaleString()} · staff #{note.authorId}</p></article>)}
      </div>
      <form className="mt-4 space-y-2" onSubmit={add}>
        <textarea className="min-h-24 w-full rounded-lg border border-stone-300 p-3" placeholder="Internal note" value={body} onChange={event => setBody(event.target.value)}/>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50" disabled={!validSourceId || !body.trim() || addState.isLoading} type="submit">Add note</button>
      </form>
    </section>
  );
}
