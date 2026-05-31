"use client";

import {useEffect, useState, type ReactNode} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateServiceMutation, useListAdminServicesQuery, useUpdateServiceMutation} from "@/features/services/services.api";
import type {AdminService, ServiceInput} from "@/types/services";

type ServiceEditorLanguage = "ua" | "en";

const emptyServices: AdminService[] = [];
const emptyForm: ServiceInput = {
    titleUa: "",
    descriptionUa: "",
    titleEn: "",
    descriptionEn: "",
    durationMinutes: 60,
    basePrice: 0,
    active: true,
    externalPaymentUrl: ""
};

export default function ServicesManagement() {
    const t = useTranslations("admin.services");
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<boolean | "">("");
    const {data, isFetching, isError} = useListAdminServicesQuery({query, active});
    const services = data?.content ?? emptyServices;
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const selectedService = selectedServiceId === null
        ? null
        : services.find((service) => service.id === selectedServiceId) ?? null;
    const [editorLanguage, setEditorLanguage] = useState<ServiceEditorLanguage>("ua");
    const [form, setForm] = useState<ServiceInput>(emptyForm);
    const [createService, {isLoading: isCreating}] = useCreateServiceMutation();
    const [updateService, {isLoading: isUpdating}] = useUpdateServiceMutation();
    const saving = isCreating || isUpdating;

    useEffect(() => {
        if (services.length === 0) {
            setSelectedServiceId(null);
            return;
        }

        if (selectedServiceId !== null && !services.some((service) => service.id === selectedServiceId)) {
            setSelectedServiceId(null);
        }
    }, [services, selectedServiceId]);

    useEffect(() => {
        if (!selectedService) {
            setForm(emptyForm);
            return;
        }

        setForm({
            titleUa: selectedService.titleUa,
            descriptionUa: selectedService.descriptionUa ?? "",
            titleEn: selectedService.titleEn ?? "",
            descriptionEn: selectedService.descriptionEn ?? "",
            durationMinutes: selectedService.durationMinutes,
            basePrice: selectedService.basePrice,
            active: selectedService.active,
            externalPaymentUrl: selectedService.externalPaymentUrl ?? ""
        });
    }, [selectedService]);

    function selectService(service: AdminService) {
        setSelectedServiceId(service.id);
    }

    function startNewService() {
        setSelectedServiceId(null);
        setEditorLanguage("ua");
        setForm(emptyForm);
    }

    function updateField<K extends keyof ServiceInput>(field: K, value: ServiceInput[K]) {
        setForm((current) => ({...current, [field]: value}));
    }

    function requestBody(): ServiceInput {
        return {
            ...form,
            titleUa: form.titleUa.trim(),
            descriptionUa: form.descriptionUa?.trim() || null,
            titleEn: form.titleEn?.trim() || null,
            descriptionEn: form.descriptionEn?.trim() || null,
            durationMinutes: Number(form.durationMinutes),
            basePrice: Number(form.basePrice),
            externalPaymentUrl: form.externalPaymentUrl?.trim() || null
        };
    }

    async function saveService() {
        try {
            const body = requestBody();
            const saved = selectedService
                ? await updateService({id: selectedService.id, body}).unwrap()
                : await createService(body).unwrap();
            setSelectedServiceId(saved.id);
            toast.success(selectedService ? t("updated") : t("created"));
        } catch {
            toast.error(t("saveError"));
        }
    }

    const uaComplete = Boolean(form.titleUa.trim());
    const enComplete = Boolean(form.titleEn?.trim());

    return (
        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(380px,1fr)_minmax(460px,0.95fr)]">
            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <button
                            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                            onClick={startNewService}
                            type="button"
                        >
                            {t("newService")}
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
                            <th className="w-[38%] px-3 py-2">{t("titleUa")}</th>
                            <th className="w-[22%] px-3 py-2">{t("duration")}</th>
                            <th className="w-[20%] px-3 py-2">{t("price")}</th>
                            <th className="w-[20%] px-3 py-2">{t("status")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {services.map((service) => {
                            const selected = service.id === selectedService?.id;
                            return (
                                <tr
                                    className={`cursor-pointer border-t border-stone-200 transition-colors ${
                                        selected ? "bg-stone-900 text-white" : "bg-white text-stone-900 hover:bg-stone-50"
                                    }`}
                                    key={service.id}
                                    onClick={() => selectService(service)}
                                >
                                    <td className="truncate px-3 py-2 font-medium">{service.titleUa}</td>
                                    <td className={`px-3 py-2 ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                        {service.durationMinutes} {t("minutesShort")}
                                    </td>
                                    <td className={`px-3 py-2 ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                        {service.basePrice}
                                    </td>
                                    <td className={`px-3 py-2 ${selected ? "text-stone-200" : "text-stone-600"}`}>
                                        {service.active ? t("active") : t("inactive")}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                    {!isFetching && services.length === 0 ? <p className="p-3 text-sm text-stone-500">{t("empty")}</p> : null}
                </div>
            </div>

            <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-950">
                    {selectedService ? t("editTitle") : t("createTitle")}
                </h2>
                <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-1">
                        <div className="grid grid-cols-2 gap-1">
                            <LanguageButton
                                active={editorLanguage === "ua"}
                                complete={uaComplete}
                                label={t("ukrainianVersion")}
                                missingLabel={t("required")}
                                onClick={() => setEditorLanguage("ua")}
                            />
                            <LanguageButton
                                active={editorLanguage === "en"}
                                complete={enComplete}
                                label={t("englishVersion")}
                                missingLabel={t("optional")}
                                onClick={() => setEditorLanguage("en")}
                            />
                        </div>
                    </div>

                    {editorLanguage === "ua" ? (
                        <div className="space-y-3">
                            <Field label={t("titleUa")}>
                                <input
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("titleUa", event.target.value)}
                                    value={form.titleUa}
                                />
                            </Field>
                            <Field label={t("descriptionUa")}>
                                <textarea
                                    className="min-h-28 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("descriptionUa", event.target.value)}
                                    value={form.descriptionUa ?? ""}
                                />
                            </Field>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Field label={t("titleEn")}>
                                <input
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("titleEn", event.target.value)}
                                    value={form.titleEn ?? ""}
                                />
                            </Field>
                            <Field label={t("descriptionEn")}>
                                <textarea
                                    className="min-h-28 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("descriptionEn", event.target.value)}
                                    value={form.descriptionEn ?? ""}
                                />
                            </Field>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t("externalPaymentUrl")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("externalPaymentUrl", event.target.value)}
                                value={form.externalPaymentUrl ?? ""}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t("duration")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                min={1}
                                onChange={(event) => updateField("durationMinutes", Number(event.target.value))}
                                type="number"
                                value={form.durationMinutes}
                            />
                        </Field>
                        <Field label={t("price")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                min={0}
                                onChange={(event) => updateField("basePrice", Number(event.target.value))}
                                step="0.01"
                                type="number"
                                value={form.basePrice}
                            />
                        </Field>
                    </div>
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
                        disabled={saving || !form.titleUa.trim() || form.durationMinutes < 1 || form.basePrice < 0}
                        onClick={saveService}
                        type="button"
                    >
                        {saving ? t("saving") : t("save")}
                    </button>
                </div>
            </div>
        </section>
    );
}

function LanguageButton({active, complete, label, missingLabel, onClick}: {
    active: boolean;
    complete: boolean;
    label: string;
    missingLabel: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-pressed={active}
            className={`flex min-h-12 items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                active ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white/70 hover:text-stone-950"
            }`}
            onClick={onClick}
            type="button"
        >
            <span>{label}</span>
            <span className={`ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${
                complete ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
            }`}>
                {complete ? "OK" : missingLabel}
            </span>
        </button>
    );
}

function Field({children, label}: {children: ReactNode; label: string}) {
    return (
        <label className="block text-sm font-medium text-stone-800">
            <span className="mb-1 block">{label}</span>
            {children}
        </label>
    );
}
