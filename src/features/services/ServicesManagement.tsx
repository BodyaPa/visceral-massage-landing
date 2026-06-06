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
    bookingMode: "INDIVIDUAL_APPOINTMENT",
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
            bookingMode: selectedService.bookingMode,
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
        <section className="grid w-full min-w-0 max-w-full items-start gap-5 xl:grid-cols-[minmax(380px,520px)_minmax(0,680px)]">
            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 break-words text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                                {services.length}
                            </span>
                            <button
                                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
                                onClick={startNewService}
                                type="button"
                            >
                                {t("newService")}
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
                        {services.map((service) => {
                            const selected = service.id === selectedService?.id;
                            return (
                                <button
                                    aria-pressed={selected}
                                    className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                                        selected
                                            ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                                            : "border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50"
                                    }`}
                                    key={service.id}
                                    onClick={() => selectService(service)}
                                    type="button"
                                >
                                    <span className="flex min-w-0 flex-col gap-2">
                                        <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                            <span className="min-w-0">
                                                <span className="block break-words text-sm font-semibold">{service.titleUa}</span>
                                                {service.titleEn ? (
                                                    <span className={`mt-1 block break-words text-xs ${selected ? "text-stone-200" : "text-stone-500"}`}>
                                                        {service.titleEn}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <StatusBadge active={selected} enabled={service.active} label={service.active ? t("active") : t("inactive")} />
                                        </span>
                                        <span className="flex flex-wrap gap-1.5">
                                            <MetaBadge active={selected} label={`${service.durationMinutes} ${t("minutesShort")}`} />
                                            <MetaBadge active={selected} label={service.bookingMode === "FIXED_EVENT" ? "Event" : "Individual"} />
                                            <MetaBadge active={selected} label={String(service.basePrice)} />
                                            {service.externalPaymentUrl ? <MetaBadge active={selected} label={t("externalPaymentUrl")} /> : null}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        {!isFetching && services.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-8 text-center">
                                <p className="text-sm text-stone-600">{t("empty")}</p>
                                <button className="mt-3 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700" onClick={startNewService} type="button">{t("newService")}</button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                            {selectedService ? `ID ${selectedService.id}` : t("newService")}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-stone-950">
                            {selectedService ? t("editTitle") : t("createTitle")}
                        </h2>
                    </div>
                    <StatusBadge enabled={form.active} label={form.active ? t("active") : t("inactive")} />
                </div>
                <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-1">
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
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
                            <Field label={t("titleUa")} tooltip={t("titleUaHint")}>
                                <input
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("titleUa", event.target.value)}
                                    value={form.titleUa}
                                />
                            </Field>
                            <Field label={t("descriptionUa")} tooltip={t("descriptionHint")}>
                                <textarea
                                    className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("descriptionUa", event.target.value)}
                                    value={form.descriptionUa ?? ""}
                                />
                            </Field>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Field label={t("titleEn")} tooltip={t("titleEnHint")}>
                                <input
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("titleEn", event.target.value)}
                                    value={form.titleEn ?? ""}
                                />
                            </Field>
                            <Field label={t("descriptionEn")} tooltip={t("descriptionHint")}>
                                <textarea
                                    className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateField("descriptionEn", event.target.value)}
                                    value={form.descriptionEn ?? ""}
                                />
                            </Field>
                        </div>
                    )}

                    <div className="max-w-full sm:max-w-xl">
                        <Field label={t("externalPaymentUrl")} tooltip={t("externalPaymentUrlHint")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("externalPaymentUrl", event.target.value)}
                                value={form.externalPaymentUrl ?? ""}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Booking mode" tooltip="Individual services generate free slots; fixed events are concrete sessions with capacity.">
                            <select
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("bookingMode", event.target.value as ServiceInput["bookingMode"])}
                                value={form.bookingMode}
                            >
                                <option value="INDIVIDUAL_APPOINTMENT">Individual appointment</option>
                                <option value="FIXED_EVENT">Fixed event</option>
                            </select>
                        </Field>
                        <Field label={t("duration")} tooltip={t("durationHint")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                min={1}
                                onChange={(event) => updateField("durationMinutes", Number(event.target.value))}
                                type="number"
                                value={form.durationMinutes}
                            />
                        </Field>
                        <Field label={t("price")} tooltip={t("priceHint")}>
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

function MetaBadge({active = false, label}: {active?: boolean; label: string}) {
    return (
        <span className={`max-w-full break-words rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-white/15 text-stone-100" : "bg-stone-100 text-stone-700"}`}>
            {label}
        </span>
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
            className={`flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                active ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white/70 hover:text-stone-950"
            }`}
            onClick={onClick}
            type="button"
        >
            <span className="min-w-0 break-words">{label}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                complete ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
            }`}>
                {complete ? "OK" : missingLabel}
            </span>
        </button>
    );
}

function Field({children, label, tooltip}: {children: ReactNode; label: string; tooltip?: string}) {
    return (
        <label className="block min-w-0 text-sm font-medium text-stone-800">
            <span className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 break-words">{label}</span>
                {tooltip ? <InfoTooltip text={tooltip} /> : null}
            </span>
            {children}
        </label>
    );
}

function InfoTooltip({text}: {text: string}) {
    return (
        <span className="group relative inline-flex">
            <span
                aria-label={text}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 bg-stone-100 text-[10px] font-bold leading-none text-stone-600"
                tabIndex={0}
            >
                i
            </span>
            <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-[min(16rem,calc(100vw-3rem))] -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-stone-700 shadow-lg group-hover:block group-focus-within:block">
                {text}
            </span>
        </span>
    );
}
