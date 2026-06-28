"use client";

import {useEffect, useState, type ReactNode} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useGetAdminSiteSettingsQuery, useUpdateSiteSettingsMutation} from "@/features/siteSettings/siteSettings.api";
import type {SiteSettingsInput} from "@/types/siteSettings";

type FieldName = keyof SiteSettingsInput;

const emptyForm: SiteSettingsInput = {
    footerBodyUa: "",
    footerBodyEn: "",
    homeIntroUa: "",
    homeIntroEn: "",
    homeBodyUa: "",
    homeBodyEn: "",
    aboutBodyUa: "",
    aboutBodyEn: "",
    contactBodyUa: "",
    contactBodyEn: "",
    heroMediaUrls: ""
};

export default function SiteSettingsManagement() {
    const t = useTranslations("admin.siteSettings");
    const toast = useToast();
    const {data, isFetching, isError} = useGetAdminSiteSettingsQuery();
    const [updateSettings, {isLoading}] = useUpdateSiteSettingsMutation();
    const [form, setForm] = useState<SiteSettingsInput>(emptyForm);

    useEffect(() => {
        if (!data) return;
        setForm({
            footerBodyUa: data.footerBodyUa ?? "",
            footerBodyEn: data.footerBodyEn ?? "",
            homeIntroUa: data.homeIntroUa ?? "",
            homeIntroEn: data.homeIntroEn ?? "",
            homeBodyUa: data.homeBodyUa ?? "",
            homeBodyEn: data.homeBodyEn ?? "",
            aboutBodyUa: data.aboutBodyUa ?? "",
            aboutBodyEn: data.aboutBodyEn ?? "",
            contactBodyUa: data.contactBodyUa ?? "",
            contactBodyEn: data.contactBodyEn ?? "",
            heroMediaUrls: data.heroMediaUrls ?? ""
        });
    }, [data]);

    function updateField(field: FieldName, value: string) {
        setForm((current) => ({...current, [field]: value}));
    }

    async function save() {
        try {
            await updateSettings(normalizeForm(form)).unwrap();
            toast.success(t("saved"));
        } catch {
            toast.error(t("saveError"));
        }
    }

    return (
        <section className="min-w-0 space-y-5">
            <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("eyebrow")}</p>
                <h1 className="mt-1 break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-stone-600">{t("subtitle")}</p>
            </header>

            {isError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
            {isFetching ? <p className="text-sm text-stone-500">{t("loading")}</p> : null}

            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <SettingsPanel title={t("footerTitle")} hint={t("footerHint")}>
                    <TextArea label={t("ua")} value={form.footerBodyUa ?? ""} onChange={(value) => updateField("footerBodyUa", value)} />
                    <TextArea label={t("en")} value={form.footerBodyEn ?? ""} onChange={(value) => updateField("footerBodyEn", value)} />
                </SettingsPanel>
                <SettingsPanel title={t("homeTitle")} hint={t("homeHint")}>
                    <TextArea label={t("ua")} value={form.homeIntroUa ?? ""} onChange={(value) => updateField("homeIntroUa", value)} />
                    <TextArea label={t("en")} value={form.homeIntroEn ?? ""} onChange={(value) => updateField("homeIntroEn", value)} />
                    <TextArea label={t("uaBody")} maxLength={12000} minHeight="min-h-44" value={form.homeBodyUa ?? ""} onChange={(value) => updateField("homeBodyUa", value)} />
                    <TextArea label={t("enBody")} maxLength={12000} minHeight="min-h-44" value={form.homeBodyEn ?? ""} onChange={(value) => updateField("homeBodyEn", value)} />
                </SettingsPanel>
                <SettingsPanel title={t("aboutTitle")} hint={t("aboutHint")}>
                    <TextArea label={t("ua")} value={form.aboutBodyUa ?? ""} onChange={(value) => updateField("aboutBodyUa", value)} />
                    <TextArea label={t("en")} value={form.aboutBodyEn ?? ""} onChange={(value) => updateField("aboutBodyEn", value)} />
                </SettingsPanel>
                <SettingsPanel title={t("contactTitle")} hint={t("contactHint")}>
                    <TextArea label={t("ua")} value={form.contactBodyUa ?? ""} onChange={(value) => updateField("contactBodyUa", value)} />
                    <TextArea label={t("en")} value={form.contactBodyEn ?? ""} onChange={(value) => updateField("contactBodyEn", value)} />
                </SettingsPanel>
                <SettingsPanel title={t("heroMediaTitle")} hint={t("heroMediaHint")}>
                    <TextArea label={t("heroMediaUrls")} value={form.heroMediaUrls ?? ""} onChange={(value) => updateField("heroMediaUrls", value)} />
                </SettingsPanel>
            </div>

            <div className="flex justify-end">
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto" disabled={isLoading} onClick={save} type="button">
                    {isLoading ? t("saving") : t("save")}
                </button>
            </div>
        </section>
    );
}

function SettingsPanel({children, hint, title}: {children: ReactNode; hint: string; title: string}) {
    return (
        <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="break-words text-base font-semibold text-stone-950">{title}</h2>
            <p className="mt-1 break-words text-xs leading-5 text-stone-500">{hint}</p>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}

function TextArea({label, maxLength = 4000, minHeight = "min-h-28", onChange, value}: {label: string; maxLength?: number; minHeight?: string; onChange: (value: string) => void; value: string}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>
            <textarea className={`${minHeight} w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800`} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} value={value} />
        </label>
    );
}

function normalizeForm(form: SiteSettingsInput): SiteSettingsInput {
    return Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value?.trim() || null])
    ) as SiteSettingsInput;
}
