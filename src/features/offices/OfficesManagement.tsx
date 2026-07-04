"use client";

import {useEffect, useState, type ChangeEvent} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateOfficeMutation, useListOfficesQuery, useUpdateOfficeMutation, useUploadOfficeMediaMutation} from "@/features/offices/offices.api";
import {createAdminMediaUrl} from "@/features/news/newsMedia";
import type {Office, OfficeInput} from "@/types/offices";

const emptyOffices: Office[] = [];
const emptyForm: OfficeInput = {
    name: "",
    address: "",
    active: true,
    directions: "",
    googleMapsUrl: "",
    photoMediaId: null,
    videoMediaId: null
};

export default function OfficesManagement() {
    const t = useTranslations("admin.offices");
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<boolean | "">("");
    const {data, isFetching, isError} = useListOfficesQuery({query, active});
    const offices = data?.content ?? emptyOffices;
    const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
    const selectedOffice = selectedOfficeId === null
        ? null
        : offices.find((office) => office.id === selectedOfficeId) ?? null;
    const [form, setForm] = useState<OfficeInput>(emptyForm);
    const [createOffice, {isLoading: isCreating}] = useCreateOfficeMutation();
    const [updateOffice, {isLoading: isUpdating}] = useUpdateOfficeMutation();
    const [uploadOfficeMedia, {isLoading: isUploading}] = useUploadOfficeMediaMutation();
    const saving = isCreating || isUpdating;

    useEffect(() => {
        if (offices.length === 0) {
            setSelectedOfficeId(null);
            return;
        }

        if (selectedOfficeId !== null && !offices.some((office) => office.id === selectedOfficeId)) {
            setSelectedOfficeId(null);
        }
    }, [offices, selectedOfficeId]);

    useEffect(() => {
        if (!selectedOffice) {
            setForm(emptyForm);
            return;
        }

        setForm({
            name: selectedOffice.name,
            address: selectedOffice.address,
            active: selectedOffice.active,
            directions: selectedOffice.directions ?? selectedOffice.locationDetails ?? "",
            googleMapsUrl: selectedOffice.googleMapsUrl ?? "",
            photoMediaId: selectedOffice.photoMediaId,
            videoMediaId: selectedOffice.videoMediaId
        });
    }, [selectedOffice]);

    function selectOffice(office: Office) {
        setSelectedOfficeId(office.id);
    }

    function startNewOffice() {
        setSelectedOfficeId(null);
        setForm(emptyForm);
    }

    function updateField<K extends keyof OfficeInput>(field: K, value: OfficeInput[K]) {
        setForm((current) => ({...current, [field]: value}));
    }

    function requestBody(): OfficeInput {
        return {
            ...form,
            directions: form.directions?.trim() || null,
            googleMapsUrl: form.googleMapsUrl?.trim() || null,
            photoMediaId: form.photoMediaId ?? null,
            videoMediaId: form.videoMediaId ?? null
        };
    }

    async function uploadMedia(event: ChangeEvent<HTMLInputElement>, field: "photoMediaId" | "videoMediaId") {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const asset = await uploadOfficeMedia(file).unwrap();
            updateField(field, asset.id);
            toast.success(t("mediaUploaded"));
        } catch {
            toast.error(t("mediaUploadError"));
        }
    }

    async function saveOffice() {
        try {
            const body = requestBody();
            const saved = selectedOffice
                ? await updateOffice({id: selectedOffice.id, body}).unwrap()
                : await createOffice(body).unwrap();
            setSelectedOfficeId(saved.id);
            toast.success(selectedOffice ? t("updated") : t("created"));
        } catch {
            toast.error(t("saveError"));
        }
    }

    return (
        <section className="grid w-full min-w-0 max-w-full items-start gap-5 xl:grid-cols-[minmax(360px,520px)_minmax(0,640px)]">
            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 break-words text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                                {offices.length}
                            </span>
                            <button
                                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                                onClick={startNewOffice}
                                type="button"
                            >
                                {t("newOffice")}
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                        <input
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t("search")}
                            value={query}
                        />
                        <select
                            className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => {
                                const value = event.target.value;
                                setActive(value === "" ? "" : value === "true");
                            }}
                            value={active === "" ? "" : String(active)}
                        >
                            <option value="">{t("allStatuses")}</option>
                            <option value="true">{t("active")}</option>
                            <option value="false">{t("inactive")}</option>
                        </select>
                    </div>
                </div>

                {isError ? <p className="text-sm text-red-700">{t("loadError")}</p> : null}
                {isFetching ? <p className="text-sm text-stone-500">{t("loading")}</p> : null}

                <div className="max-h-[36rem] overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70 p-2">
                    <div className="space-y-2" role="list">
                        {offices.map((office) => {
                            const selected = office.id === selectedOffice?.id;
                            return (
                                <button
                                    aria-pressed={selected}
                                    className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                                        selected
                                            ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                                            : "border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50"
                                    }`}
                                    key={office.id}
                                    onClick={() => selectOffice(office)}
                                    type="button"
                                >
                                    <span className="flex min-w-0 flex-col gap-2">
                                        <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                            <span className="min-w-0">
                                                <span className="block break-words text-sm font-semibold">{office.name}</span>
                                                <span className={`mt-1 block break-words text-xs ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                                    {office.address}
                                                </span>
                                            </span>
                                            <StatusBadge active={selected} enabled={office.active} label={office.active ? t("active") : t("inactive")} />
                                        </span>
                                        {office.directions || office.locationDetails ? (
                                            <span className={`block break-words text-xs ${selected ? "text-stone-200" : "text-stone-500"}`}>
                                                {office.directions ?? office.locationDetails}
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            );
                        })}
                        {!isFetching && offices.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-8 text-center">
                                <p className="text-sm text-stone-600">{t("empty")}</p>
                                <button className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700" onClick={startNewOffice} type="button">{t("newOffice")}</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                            {selectedOffice ? `ID ${selectedOffice.id}` : t("newOffice")}
                        </p>
                        <h2 className="mt-1 break-words text-xl font-semibold text-stone-950">
                            {selectedOffice ? t("editTitle") : t("createTitle")}
                        </h2>
                    </div>
                    <StatusBadge enabled={form.active} label={form.active ? t("active") : t("inactive")} />
                </div>
                <div className="mt-4 space-y-3">
                    <Field label={t("name")}>
                        <input
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => updateField("name", event.target.value)}
                            value={form.name}
                        />
                    </Field>
                    <Field label={t("address")}>
                        <input
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => updateField("address", event.target.value)}
                            value={form.address}
                        />
                    </Field>
                    <Field label={t("directions")}>
                        <textarea
                            className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => updateField("directions", event.target.value)}
                            value={form.directions ?? ""}
                        />
                    </Field>
                    <Field label={t("googleMapsUrl")}>
                        <input
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => updateField("googleMapsUrl", event.target.value)}
                            placeholder="https://maps.google.com/..."
                            value={form.googleMapsUrl ?? ""}
                        />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <MediaField
                            accept="image/jpeg,image/png,image/webp"
                            disabled={isUploading}
                            hint={t("mediaHint")}
                            id={form.photoMediaId ?? null}
                            label={t("photoMedia")}
                            noMedia={t("noMedia")}
                            onClear={() => updateField("photoMediaId", null)}
                            onUpload={(event) => uploadMedia(event, "photoMediaId")}
                            previewType="image"
                            replaceLabel={t("replaceMedia")}
                            uploadLabel={t("uploadMedia")}
                        />
                        <MediaField
                            accept="video/mp4,video/webm"
                            disabled={isUploading}
                            hint={t("mediaHint")}
                            id={form.videoMediaId ?? null}
                            label={t("videoMedia")}
                            noMedia={t("noMedia")}
                            onClear={() => updateField("videoMediaId", null)}
                            onUpload={(event) => uploadMedia(event, "videoMediaId")}
                            previewType="video"
                            replaceLabel={t("replaceMedia")}
                            uploadLabel={t("uploadMedia")}
                        />
                    </div>
                    <label className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        form.active ? "border-stone-300 bg-stone-100 text-stone-950" : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}>
                        <span className="min-w-0 break-words">{t("active")}</span>
                        <input
                            checked={form.active}
                            onChange={(event) => updateField("active", event.target.checked)}
                            type="checkbox"
                        />
                    </label>
                    <button
                        className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-fit"
                        disabled={saving || !form.name.trim() || !form.address.trim()}
                        onClick={saveOffice}
                        type="button"
                    >
                        {saving ? t("saving") : t("save")}
                    </button>
                </div>
            </div>
        </section>
    );
}

function StatusBadge({active = false, enabled, label}: {active?: boolean; enabled: boolean; label: string}) {
    if (enabled) {
        return (
            <span className={`w-fit max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-emerald-50 text-emerald-800"}`}>
                {label}
            </span>
        );
    }

    return (
        <span className={`w-fit max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-stone-100 text-stone-600"}`}>
            {label}
        </span>
    );
}

function MediaField({accept, disabled, hint, id, label, noMedia, onClear, onUpload, previewType, replaceLabel, uploadLabel}: {accept: string; disabled: boolean; hint: string; id: string | null; label: string; noMedia: string; onClear: () => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; previewType: "image" | "video"; replaceLabel: string; uploadLabel: string}) {
    const previewUrl = id ? createAdminMediaUrl(id) : null;

    return (
        <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="break-words text-sm font-medium text-stone-800">{label}</p>
                {id ? <button aria-label={noMedia} className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-50" onClick={onClear} type="button">×</button> : null}
            </div>
            {previewUrl ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-white">
                    {previewType === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin media preview is loaded through protected API content.
                        <img alt="" className="h-32 w-full object-cover" src={previewUrl} />
                    ) : (
                        <video className="h-32 w-full bg-black object-cover" controls src={previewUrl} />
                    )}
                </div>
            ) : <p className="mt-3 text-xs text-stone-500">{noMedia}</p>}
            <label className={`mt-3 inline-flex cursor-pointer rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                {id ? replaceLabel : uploadLabel}
                <input accept={accept} className="sr-only" disabled={disabled} onChange={onUpload} type="file" />
            </label>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{hint}</p>
        </div>
    );
}

function Field({children, label}: {children: React.ReactNode; label: string}) {
    return (
        <label className="block min-w-0 text-sm font-medium text-stone-800">
            <span className="mb-1 block break-words">{label}</span>
            {children}
        </label>
    );
}
