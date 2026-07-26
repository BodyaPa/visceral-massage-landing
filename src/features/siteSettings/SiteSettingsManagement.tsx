"use client";

import {useEffect, useState, type ReactNode} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import NewsRichTextEditor, {type NewsEditorLabels, type NewsEditorPastedImage} from "@/features/news/NewsRichTextEditor";
import {
    useGetAdminSiteSettingsQuery,
    useUpdateSiteSettingsMutation,
    useUploadSiteSettingsContentMediaMutation
} from "@/features/siteSettings/siteSettings.api";
import {createSiteMediaPath} from "@/features/siteSettings/siteSettingsMedia";
import type {SiteSettingsInput} from "@/types/siteSettings";

type FieldName = keyof SiteSettingsInput;
type SitePage = "home" | "about" | "contact";
type ContentLocale = "ua" | "en";
type PageField = "homeBodyUa" | "homeBodyEn" | "aboutBodyUa" | "aboutBodyEn" | "contactBodyUa" | "contactBodyEn";

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
    contactBodyEn: ""
};

export default function SiteSettingsManagement() {
    const t = useTranslations("admin.siteSettings");
    const format = useTranslations("admin.news.editor.format");
    const toast = useToast();
    const {data, isFetching, isError} = useGetAdminSiteSettingsQuery();
    const [updateSettings, {isLoading}] = useUpdateSiteSettingsMutation();
    const [uploadContentMedia] = useUploadSiteSettingsContentMediaMutation();
    const [form, setForm] = useState<SiteSettingsInput>(emptyForm);
    const [activePage, setActivePage] = useState<SitePage>("home");
    const [activeLocale, setActiveLocale] = useState<ContentLocale>("ua");
    const activeField = pageField(activePage, activeLocale);
    const toolbarLabels: NewsEditorLabels = {
        bold: format("bold"),
        italic: format("italic"),
        strike: format("strike"),
        inlineCode: format("inlineCode"),
        paragraph: format("paragraph"),
        headingTwo: format("headingTwo"),
        headingThree: format("headingThree"),
        bulletList: format("bulletList"),
        orderedList: format("orderedList"),
        blockquote: format("blockquote"),
        divider: format("divider"),
        link: format("link"),
        unlink: format("unlink"),
        linkPrompt: format("linkPrompt"),
        invalidLink: format("invalidLink"),
        undo: format("undo"),
        redo: format("redo")
    };

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
            contactBodyEn: data.contactBodyEn ?? ""
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

    async function uploadPastedImage(file: File): Promise<NewsEditorPastedImage> {
        try {
            const asset = await uploadContentMedia(file).unwrap();
            toast.success(t("contentImageUploaded"));
            return {
                src: createSiteMediaPath(asset.id),
                alt: asset.originalFilename
            };
        } catch {
            toast.error(t("contentImageUploadError"));
            throw new Error("Unable to upload pasted image");
        }
    }

    return (
        <section className="min-w-0 space-y-5">
            <header className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("eyebrow")}</p>
                <h1 className="mt-1 break-words text-2xl font-semibold text-stone-950">{t("title")}</h1>
                <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-stone-600">{t("subtitle")}</p>
            </header>

            {isError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
            {isFetching ? <p className="text-sm text-stone-500">{t("loading")}</p> : null}

            <div className="min-w-0 space-y-4">
                <SettingsPanel title={t("pageContentTitle")} hint={t("pageContentHint")}>
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <nav className="min-w-0 rounded-2xl border border-stone-200 bg-stone-50 p-2.5" aria-label={t("pageTabsLabel")}>
                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{t("pageTabsLabel")}</p>
                            {sitePages.map((page, index) => (
                                <button aria-pressed={activePage === page} className={activePage === page ? activePageButtonClass : pageButtonClass} key={page} onClick={() => setActivePage(page)} type="button">
                                    <span className={activePage === page ? activePageIndexClass : pageIndexClass}>{index + 1}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">{t(`pageTabs.${page}`)}</span>
                                        <span className="mt-1 block text-xs font-normal leading-5 text-current opacity-70">{t(`pageDescriptions.${page}`)}</span>
                                    </span>
                                </button>
                            ))}
                        </nav>

                        <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
                            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none sm:flex-row sm:items-start sm:justify-between sm:p-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("editingNow")}</p>
                                    <h3 className="mt-1 break-words text-xl font-semibold text-stone-950">{t(`pageTabs.${activePage}`)}</h3>
                                    <p className="mt-1 break-words text-sm leading-6 text-stone-500">{t(`pageDescriptions.${activePage}`)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1" role="tablist" aria-label={t("languageTabsLabel")}>
                                    {locales.map((locale) => (
                                        <button className={activeLocale === locale ? activeLocaleClass : localeClass} key={locale} onClick={() => setActiveLocale(locale)} type="button">
                                            {t(locale)}
                                        </button>
                                    ))}
                                </div>
                                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">{t("currentLanguage", {language: t(activeLocale)})}</span>
                            </div>

                            {activePage === "home" ? (
                                <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                                    <TextArea label={activeLocale === "ua" ? t("homeIntroUa") : t("homeIntroEn")} minHeight="min-h-20" value={(activeLocale === "ua" ? form.homeIntroUa : form.homeIntroEn) ?? ""} onChange={(value) => updateField(activeLocale === "ua" ? "homeIntroUa" : "homeIntroEn", value)} />
                                </div>
                            ) : null}

                            <div className="mt-4">
                                <NewsRichTextEditor
                                    ariaLabel={`${t(`pageTabs.${activePage}`)} ${t(activeLocale)}`}
                                    labels={toolbarLabels}
                                    onChange={(value) => updateField(activeField, value)}
                                    onPasteImage={uploadPastedImage}
                                    value={form[activeField] ?? ""}
                                />
                            </div>
                        </div>
                    </div>
                </SettingsPanel>

                <SettingsPanel title={t("footerTitle")} hint={t("footerHint")}>
                    <div className="grid gap-3 md:grid-cols-2">
                        <TextArea label={t("ua")} value={form.footerBodyUa ?? ""} onChange={(value) => updateField("footerBodyUa", value)} />
                        <TextArea label={t("en")} value={form.footerBodyEn ?? ""} onChange={(value) => updateField("footerBodyEn", value)} />
                    </div>
                </SettingsPanel>
            </div>

            <div className="flex justify-end">
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300 motion-reduce:transition-none sm:w-auto" disabled={isLoading} onClick={save} type="button">
                    {isLoading ? t("saving") : t("save")}
                </button>
            </div>
        </section>
    );
}

const sitePages: SitePage[] = ["home", "about", "contact"];
const locales: ContentLocale[] = ["ua", "en"];
const pageButtonClass = "mb-1 flex w-full gap-3 rounded-xl border border-transparent px-3 py-3 text-left text-stone-700 transition-[background-color,border-color,box-shadow] duration-200 hover:border-stone-200 hover:bg-white last:mb-0 motion-reduce:transition-none";
const activePageButtonClass = "mb-1 flex w-full gap-3 rounded-xl border border-stone-900 bg-white px-3 py-3 text-left text-stone-950 shadow-sm transition-[background-color,border-color,box-shadow] duration-200 last:mb-0 motion-reduce:transition-none";
const pageIndexClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-xs font-semibold text-stone-500";
const activePageIndexClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white";
const localeClass = "rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 transition-[background-color,color,box-shadow] duration-200 hover:bg-white hover:text-stone-900 motion-reduce:transition-none";
const activeLocaleClass = "rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-stone-950 shadow-sm transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none";

function pageField(page: SitePage, locale: ContentLocale): PageField {
    const suffix = locale === "ua" ? "Ua" : "En";
    return `${page}Body${suffix}` as PageField;
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
