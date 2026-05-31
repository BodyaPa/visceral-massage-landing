"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateOfficeMutation, useListOfficesQuery, useUpdateOfficeMutation} from "@/features/offices/offices.api";
import type {Office, OfficeInput} from "@/types/offices";

const emptyOffices: Office[] = [];
const emptyForm: OfficeInput = {
    name: "",
    address: "",
    active: true,
    phone: "",
    email: "",
    locationDetails: ""
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
            phone: selectedOffice.phone ?? "",
            email: selectedOffice.email ?? "",
            locationDetails: selectedOffice.locationDetails ?? ""
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
            phone: form.phone?.trim() || null,
            email: form.email?.trim() || null,
            locationDetails: form.locationDetails?.trim() || null
        };
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
        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(360px,1fr)_minmax(420px,0.9fr)]">
            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <button
                            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                            onClick={startNewOffice}
                            type="button"
                        >
                            {t("newOffice")}
                        </button>
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

                <div className="max-h-[62vh] overflow-auto rounded-lg border border-stone-200">
                    <table className="min-w-full table-fixed border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-stone-100 text-xs font-semibold uppercase text-stone-500">
                        <tr>
                            <th className="w-[32%] px-3 py-2">{t("name")}</th>
                            <th className="w-[44%] px-3 py-2">{t("address")}</th>
                            <th className="w-[24%] px-3 py-2">{t("status")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {offices.map((office) => {
                            const selected = office.id === selectedOffice?.id;
                            return (
                                <tr
                                    className={`cursor-pointer border-t border-stone-200 transition-colors ${
                                        selected ? "bg-stone-900 text-white" : "bg-white text-stone-900 hover:bg-stone-50"
                                    }`}
                                    key={office.id}
                                    onClick={() => selectOffice(office)}
                                >
                                    <td className="truncate px-3 py-2 font-medium">{office.name}</td>
                                    <td className={`truncate px-3 py-2 ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                        {office.address}
                                    </td>
                                    <td className={`px-3 py-2 ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                        {office.active ? t("active") : t("inactive")}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                    {!isFetching && offices.length === 0 ? <p className="p-3 text-sm text-stone-500">{t("empty")}</p> : null}
                </div>
            </div>

            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-950">
                    {selectedOffice ? t("editTitle") : t("createTitle")}
                </h2>
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
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t("phone")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("phone", event.target.value)}
                                value={form.phone ?? ""}
                            />
                        </Field>
                        <Field label={t("email")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("email", event.target.value)}
                                value={form.email ?? ""}
                            />
                        </Field>
                    </div>
                    <Field label={t("locationDetails")}>
                        <textarea
                            className="min-h-28 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                            onChange={(event) => updateField("locationDetails", event.target.value)}
                            value={form.locationDetails ?? ""}
                        />
                    </Field>
                    <label className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900">
                        <span>{t("active")}</span>
                        <input
                            checked={form.active}
                            onChange={(event) => updateField("active", event.target.checked)}
                            type="checkbox"
                        />
                    </label>
                    <button
                        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
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

function Field({children, label}: {children: React.ReactNode; label: string}) {
    return (
        <label className="block text-sm font-medium text-stone-800">
            <span className="mb-1 block">{label}</span>
            {children}
        </label>
    );
}
