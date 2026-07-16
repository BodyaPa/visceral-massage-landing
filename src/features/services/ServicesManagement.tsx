"use client";

import {useEffect, useState, type ChangeEvent, type ReactNode} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateAdminMembershipOfferMutation, useListAdminMembershipOffersQuery, useUpdateAdminMembershipOfferMutation, useUploadAdminMembershipOfferMediaMutation} from "@/features/memberships/memberships.api";
import {useCreateServiceMutation, useListAdminServicesQuery, useUpdateServiceMutation} from "@/features/services/services.api";
import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";
import type {MembershipOffer, MembershipOfferKind, MembershipOfferUpdateInput} from "@/types/memberships";
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
    businessDirection: "MASSAGE",
    requiredResourceType: "MASSAGE_ROOM",
    bookingMode: "INDIVIDUAL_APPOINTMENT",
    active: true,
    externalPaymentUrl: "",
    loyaltyPointsAward: 0
};
const emptyOfferForm: MembershipOfferUpdateInput = {
    titleUa: "",
    titleEn: "",
    descriptionUa: "",
    descriptionEn: "",
    price: 0,
    externalPaymentUrl: "",
    visitsTotal: 0,
    validityDays: 30,
    active: true,
    eligibleServiceIds: [],
    backgroundMediaId: null
};

export default function ServicesManagement() {
    const t = useTranslations("admin.services");
    const toast = useToast();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<boolean | "">("");
    const {data, isFetching, isError} = useListAdminServicesQuery({query, active});
    const {data: allServicesData} = useListAdminServicesQuery({query: "", active: "", size: 200});
    const {data: membershipOffers = [], isFetching: offersFetching, isError: offersError} = useListAdminMembershipOffersQuery();
    const services = data?.content ?? emptyServices;
    const allServices = allServicesData?.content ?? emptyServices;
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
    const selectedService = selectedServiceId === null
        ? null
        : services.find((service) => service.id === selectedServiceId) ?? null;
    const [editorLanguage, setEditorLanguage] = useState<ServiceEditorLanguage>("ua");
    const [form, setForm] = useState<ServiceInput>(emptyForm);
    const [createService, {isLoading: isCreating}] = useCreateServiceMutation();
    const [updateService, {isLoading: isUpdating}] = useUpdateServiceMutation();
    const [updateMembershipOffer, {isLoading: isUpdatingOffer}] = useUpdateAdminMembershipOfferMutation();
    const [createMembershipOffer, {isLoading: isCreatingOffer}] = useCreateAdminMembershipOfferMutation();
    const [uploadMembershipOfferMedia, {isLoading: isUploadingOfferMedia}] = useUploadAdminMembershipOfferMediaMutation();
    const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
    const selectedOffer = selectedOfferId === null
        ? membershipOffers[0] ?? null
        : membershipOffers.find((offer) => offer.id === selectedOfferId) ?? null;
    const [offerForm, setOfferForm] = useState<MembershipOfferUpdateInput>(emptyOfferForm);
    const [creatingOfferKind, setCreatingOfferKind] = useState<MembershipOfferKind | null>(null);
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
            businessDirection: selectedService.businessDirection,
            requiredResourceType: selectedService.requiredResourceType,
            bookingMode: selectedService.bookingMode,
            active: selectedService.active,
            externalPaymentUrl: selectedService.externalPaymentUrl ?? "",
            loyaltyPointsAward: selectedService.loyaltyPointsAward
        });
    }, [selectedService]);

    useEffect(() => {
        if (membershipOffers.length === 0) {
            setSelectedOfferId(null);
            return;
        }

        if (selectedOfferId === null || !membershipOffers.some((offer) => offer.id === selectedOfferId)) {
            setSelectedOfferId(membershipOffers[0].id);
        }
    }, [membershipOffers, selectedOfferId]);

    useEffect(() => {
        if (creatingOfferKind) return;
        if (!selectedOffer) {
            setOfferForm(emptyOfferForm);
            return;
        }

        setOfferForm({
            titleUa: selectedOffer.titleUa,
            titleEn: selectedOffer.titleEn ?? "",
            descriptionUa: selectedOffer.descriptionUa ?? "",
            descriptionEn: selectedOffer.descriptionEn ?? "",
            price: selectedOffer.price,
            externalPaymentUrl: selectedOffer.externalPaymentUrl ?? "",
            visitsTotal: selectedOffer.visitsTotal,
            validityDays: selectedOffer.validityDays,
            active: selectedOffer.active,
            eligibleServiceIds: selectedOffer.eligibleServiceIds,
            backgroundMediaId: selectedOffer.backgroundMediaId
        });
    }, [creatingOfferKind, selectedOffer]);

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
            loyaltyPointsAward: Number(form.loyaltyPointsAward),
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

    async function saveMembershipOffer() {
        if (!selectedOffer && !creatingOfferKind) return;
        try {
            const body: MembershipOfferUpdateInput = {
                ...offerForm,
                titleUa: offerForm.titleUa.trim(),
                titleEn: offerForm.titleEn?.trim() || null,
                descriptionUa: offerForm.descriptionUa?.trim() || null,
                descriptionEn: offerForm.descriptionEn?.trim() || null,
                price: Number(offerForm.price),
                externalPaymentUrl: offerForm.externalPaymentUrl?.trim() || null,
                visitsTotal: offerForm.visitsTotal == null ? null : Number(offerForm.visitsTotal),
                validityDays: Number(offerForm.validityDays),
                eligibleServiceIds: offerForm.eligibleServiceIds,
                backgroundMediaId: offerForm.backgroundMediaId
            };
            const saved = creatingOfferKind
                ? await createMembershipOffer({kind: creatingOfferKind, offer: body}).unwrap()
                : await updateMembershipOffer({id: selectedOffer!.id, body}).unwrap();
            setCreatingOfferKind(null);
            setSelectedOfferId(saved.id);
            toast.success(creatingOfferKind ? t("memberships.created") : t("memberships.updated"));
        } catch {
            toast.error(t("memberships.saveError"));
        }
    }

    const uaComplete = Boolean(form.titleUa.trim());
    const enComplete = Boolean(form.titleEn?.trim());

    return (
        <section className="w-full min-w-0 max-w-full space-y-5">
            <div className="grid w-full min-w-0 max-w-full items-start gap-5 xl:grid-cols-[488px_minmax(0,1fr)]">
            <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                            <p className="mt-1 break-words text-sm text-stone-600">{t("subtitle")}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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

                <div className="max-h-[38rem] overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70 p-2">
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
                                            <MetaBadge active={selected} label={service.bookingMode === "FIXED_EVENT" ? t("fixedEvent") : t("individualAppointment")} />
                                            <MetaBadge active={selected} label={service.businessDirection === "TRAINING" ? t("directionTraining") : t("directionMassage")} />
                                            <MetaBadge active={selected} label={String(service.basePrice)} />
                                            {service.externalPaymentUrl ? <MetaBadge active={selected} label={t("externalPaymentUrl")} /> : null}
                                            {service.loyaltyPointsAward > 0 ? <MetaBadge active={selected} label={t("loyaltyPointsBadge", {count: service.loyaltyPointsAward})} /> : null}
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

            <div className="min-w-0 self-stretch">
            <div className="flex h-full min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                            {selectedService ? t("editTitle") : t("newService")}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-stone-950">
                            {selectedService ? t("editTitle") : t("createTitle")}
                        </h2>
                    </div>
                    <StatusBadge enabled={form.active} label={form.active ? t("active") : t("inactive")} />
                </div>
                <div className="mt-4 flex flex-1 flex-col gap-3">
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-1">
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            <LanguageButton
                                active={editorLanguage === "ua"}
                                complete={uaComplete}
                                completeLabel={t("complete")}
                                label={t("ukrainianVersion")}
                                missingLabel={t("required")}
                                onClick={() => setEditorLanguage("ua")}
                            />
                            <LanguageButton
                                active={editorLanguage === "en"}
                                complete={enComplete}
                                completeLabel={t("complete")}
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

                    <div className="w-full">
                        <Field label={t("externalPaymentUrl")} tooltip={t("externalPaymentUrlHint")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("externalPaymentUrl", event.target.value)}
                                value={form.externalPaymentUrl ?? ""}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t("businessDirection")} tooltip={t("businessDirectionHint")}>
                            <select
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => {
                                    const businessDirection = event.target.value as ServiceInput["businessDirection"];
                                    setForm((current) => ({
                                        ...current,
                                        businessDirection,
                                        requiredResourceType: businessDirection === "TRAINING" ? "TRAINING_HALL" : "MASSAGE_ROOM"
                                    }));
                                }}
                                value={form.businessDirection}
                            >
                                <option value="MASSAGE">{t("directionMassage")}</option>
                                <option value="TRAINING">{t("directionTraining")}</option>
                            </select>
                        </Field>
                        <Field label={t("requiredResourceType")} tooltip={t("requiredResourceTypeHint")}>
                            <input className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-sm text-stone-700" readOnly value={form.requiredResourceType === "TRAINING_HALL" ? t("resourceTrainingHall") : t("resourceMassageRoom")} />
                        </Field>
                        <Field label={t("bookingMode")} tooltip={t("bookingModeHint")}>
                            <select
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateField("bookingMode", event.target.value as ServiceInput["bookingMode"])}
                                value={form.bookingMode}
                            >
                                <option value="INDIVIDUAL_APPOINTMENT">{t("individualAppointment")}</option>
                                <option value="FIXED_EVENT">{t("fixedEvent")}</option>
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
                        <Field label={t("loyaltyPointsAward")} tooltip={t("loyaltyPointsAwardHint")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                min={0}
                                onChange={(event) => updateField("loyaltyPointsAward", Number(event.target.value))}
                                type="number"
                                value={form.loyaltyPointsAward}
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
                    <div className="mt-auto flex pt-3"><button
                        className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                        disabled={saving || !form.titleUa.trim() || form.durationMinutes < 1 || form.basePrice < 0 || form.loyaltyPointsAward < 0}
                        onClick={saveService}
                        type="button"
                    >
                        {saving ? t("saving") : t("save")}
                    </button></div>
                </div>
            </div>
            </div>
            </div>
            <MembershipOffersPanel
                allServices={allServices}
                form={offerForm}
                isError={offersError}
                isFetching={offersFetching}
                creatingKind={creatingOfferKind}
                isSaving={isUpdatingOffer || isCreatingOffer}
                isUploadingMedia={isUploadingOfferMedia}
                offers={membershipOffers}
                onChange={setOfferForm}
                onUploadMedia={async (file) => {
                    const media = await uploadMembershipOfferMedia(file).unwrap();
                    setOfferForm((current) => ({...current, backgroundMediaId: media.id}));
                    return media.id;
                }}
                onSave={saveMembershipOffer}
                onSelect={(id) => {setCreatingOfferKind(null);setSelectedOfferId(id)}}
                onStartCreate={(kind) => {
                    setCreatingOfferKind(kind);
                    setOfferForm({...emptyOfferForm, visitsTotal: kind === "MEMBERSHIP" ? 1 : null});
                }}
                selectedOffer={selectedOffer}
                t={t}
            />
        </section>
    );
}

function MembershipOffersPanel({allServices, creatingKind, form, isError, isFetching, isSaving, isUploadingMedia, offers, onChange, onSave, onSelect, onStartCreate, onUploadMedia, selectedOffer, t}: {
    allServices: AdminService[];
    creatingKind: MembershipOfferKind | null;
    form: MembershipOfferUpdateInput;
    isError: boolean;
    isFetching: boolean;
    isSaving: boolean;
    isUploadingMedia: boolean;
    offers: MembershipOffer[];
    onChange: (form: MembershipOfferUpdateInput) => void;
    onSave: () => void;
    onSelect: (id: number) => void;
    onStartCreate: (kind: MembershipOfferKind) => void;
    onUploadMedia: (file: File) => Promise<string>;
    selectedOffer: MembershipOffer | null;
    t: ReturnType<typeof useTranslations<"admin.services">>;
}) {
    function updateField<K extends keyof MembershipOfferUpdateInput>(field: K, value: MembershipOfferUpdateInput[K]) {
        onChange({...form, [field]: value});
    }

    function toggleService(serviceId: number, enabled: boolean) {
        const nextIds = enabled
            ? Array.from(new Set([...form.eligibleServiceIds, serviceId]))
            : form.eligibleServiceIds.filter((id) => id !== serviceId);
        updateField("eligibleServiceIds", nextIds);
    }

    const currentKind = creatingKind ?? selectedOffer?.kind ?? null;
    const saveDisabled = isSaving || isUploadingMedia || !currentKind || !form.titleUa.trim() || form.price < 0 || form.validityDays < 1 || (currentKind === "MEMBERSHIP" && (!form.visitsTotal || form.visitsTotal < 1));
    const previewUrl = form.backgroundMediaId === selectedOffer?.backgroundMediaId ? selectedOffer?.backgroundMediaUrl : null;

    async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            await onUploadMedia(file);
        } catch {
            // The page-level toast would be too detached from this compact editor.
        }
    }

    return (
        <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("memberships.eyebrow")}</p>
                    <h2 className="mt-1 break-words text-xl font-semibold text-stone-950">{t("memberships.title")}</h2>
                    <p className="mt-1 break-words text-sm text-stone-500">{t("memberships.subtitle")}</p>
                </div>
                <div className="flex min-h-10 items-center">
                    <button aria-pressed={creatingKind === "MEMBERSHIP"} className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-stone-700 active:scale-[0.98] motion-reduce:transition-none" onClick={() => onStartCreate("MEMBERSHIP")} type="button">{t("memberships.newMembership")}</button>
                </div>
            </div>
            {isError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("memberships.loadError")}</p> : null}
            {isFetching ? <p className="mt-4 text-sm text-stone-500">{t("loading")}</p> : null}
            {offers.length > 0 || creatingKind ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="grid gap-2 sm:grid-cols-2 lg:block lg:space-y-2">
                        {offers.map((offer) => (
                            <button
                                aria-pressed={!creatingKind && offer.id === selectedOffer?.id}
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${!creatingKind && offer.id === selectedOffer?.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50 text-stone-800 hover:bg-white"}`}
                                key={offer.id}
                                onClick={() => onSelect(offer.id)}
                                type="button"
                            >
                                <span className="block break-words font-semibold">{offer.titleUa}</span>
                                <span className="mt-1 block break-words text-xs opacity-75">{offer.kind === "CERTIFICATE" ? t("memberships.certificate") : t("memberships.membership")}</span>
                            </button>
                        ))}
                    </div>
                    {selectedOffer || creatingKind ? (
                        <div className="min-w-0 space-y-3 motion-reduce:animate-none animate-[content-enter_200ms_ease-out_both]" key={creatingKind ? `create-${creatingKind}` : `offer-${selectedOffer?.id ?? "none"}`}>
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="grid gap-3 sm:grid-cols-2">
                                <Field label={t("memberships.titleUa")}>
                                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => updateField("titleUa", event.target.value)} value={form.titleUa} />
                                </Field>
                                <Field label={t("memberships.titleEn")}>
                                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => updateField("titleEn", event.target.value)} value={form.titleEn ?? ""} />
                                </Field>
                                <Field label={t("memberships.price")}>
                                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" min={0} onChange={(event) => updateField("price", Number(event.target.value))} step="0.01" type="number" value={form.price} />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label={t("memberships.externalPaymentUrl")}>
                                        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => updateField("externalPaymentUrl", event.target.value)} value={form.externalPaymentUrl ?? ""} />
                                    </Field>
                                    <p className="mt-1 text-xs leading-5 text-stone-500">{t("memberships.externalPaymentUrlHint")}</p>
                                </div>
                                <Field label={t("memberships.validityDays")}>
                                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" min={1} onChange={(event) => updateField("validityDays", Number(event.target.value))} type="number" value={form.validityDays} />
                                </Field>
                                <Field label={t("memberships.visitsTotal")}>
                                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" min={0} onChange={(event) => updateField("visitsTotal", event.target.value === "" ? null : Number(event.target.value))} type="number" value={form.visitsTotal ?? ""} />
                                </Field>
                                <label className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${form.active ? "border-stone-300 bg-stone-100 text-stone-950" : "border-stone-200 bg-stone-50 text-stone-700"}`}>
                                    <span className="min-w-0 break-words">{t("active")}</span>
                                    <input checked={form.active} onChange={(event) => updateField("active", event.target.checked)} type="checkbox" />
                                </label>
                                </div>
                                <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-3">
                                    <div className="aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-white">
                                        {previewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element -- admin offer background preview uses API-served media.
                                            <img alt="" className="h-full w-full object-cover" src={resolveApiMediaUrl(previewUrl)} />
                                        ) : form.backgroundMediaId ? (
                                            <div className="flex h-full items-center justify-center px-3 text-center text-xs leading-5 text-stone-600">{t("memberships.backgroundSelected")}</div>
                                        ) : (
                                            <div className="flex h-full items-center justify-center px-3 text-center text-xs leading-5 text-stone-500">{t("memberships.backgroundEmpty")}</div>
                                        )}
                                    </div>
                                    <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100">
                                        {isUploadingMedia ? t("memberships.backgroundUploading") : t("memberships.backgroundUpload")}
                                        <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploadingMedia} onChange={uploadBackground} type="file" />
                                    </label>
                                    {form.backgroundMediaId ? (
                                        <button className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100" disabled={isUploadingMedia} onClick={() => updateField("backgroundMediaId", null)} type="button">
                                            {t("memberships.backgroundRemove")}
                                        </button>
                                    ) : null}
                                    <p className="mt-2 text-xs leading-5 text-stone-500">{t("memberships.backgroundHint")}</p>
                                </div>
                            </div>
                            <Field label={t("memberships.descriptionUa")}>
                                <textarea className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => updateField("descriptionUa", event.target.value)} value={form.descriptionUa ?? ""} />
                            </Field>
                            <Field label={t("memberships.descriptionEn")}>
                                <textarea className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => updateField("descriptionEn", event.target.value)} value={form.descriptionEn ?? ""} />
                            </Field>
                            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                                <p className="break-words text-sm font-semibold text-stone-900">{t("memberships.eligibleServices")}</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {allServices.map((service) => (
                                        <label className="flex min-w-0 items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700" key={service.id}>
                                            <input checked={form.eligibleServiceIds.includes(service.id)} className="mt-1" onChange={(event) => toggleService(service.id, event.target.checked)} type="checkbox" />
                                            <span className="min-w-0">
                                                <span className="block break-words font-medium text-stone-900">{service.titleUa}</span>
                                                <span className="mt-0.5 block break-words text-xs text-stone-500">{service.bookingMode === "FIXED_EVENT" ? t("fixedEvent") : t("individualAppointment")}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end"><button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-fit" disabled={saveDisabled} onClick={onSave} type="button">
                                {isSaving ? t("saving") : creatingKind ? t("memberships.create") : t("memberships.save")}
                            </button></div>
                        </div>
                    ) : null}
                </div>
            ) : null}
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

function LanguageButton({active, complete, completeLabel, label, missingLabel, onClick}: {
    active: boolean;
    complete: boolean;
    completeLabel: string;
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
                {complete ? completeLabel : missingLabel}
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
