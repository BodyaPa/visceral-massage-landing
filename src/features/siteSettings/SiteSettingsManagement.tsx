"use client";

import {type ChangeEvent, useEffect, useState, type ReactNode} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import NewsRichTextEditor, {type NewsEditorImageInsertion, type NewsEditorLabels} from "@/features/news/NewsRichTextEditor";
import {
    useGetAdminSiteSettingsQuery,
    useListAdminSiteSettingsMediaQuery,
    useReorderSiteSettingsMediaMutation,
    useUnlinkSiteSettingsMediaMutation,
    useUpdateSiteSettingsMutation,
    useUploadSiteSettingsMediaMutation
} from "@/features/siteSettings/siteSettings.api";
import {createAdminSiteMediaUrl, createSiteMediaPath} from "@/features/siteSettings/siteSettingsMedia";
import type {MediaAsset} from "@/types/news";
import type {SiteSettingsInput} from "@/types/siteSettings";

type FieldName = keyof SiteSettingsInput;
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
    contactBodyEn: "",
    heroMediaUrls: ""
};

export default function SiteSettingsManagement() {
    const t = useTranslations("admin.siteSettings");
    const format = useTranslations("admin.news.editor.format");
    const toast = useToast();
    const {data, isFetching, isError} = useGetAdminSiteSettingsQuery();
    const {data: media = [], isFetching: mediaFetching, isError: mediaError} = useListAdminSiteSettingsMediaQuery();
    const [updateSettings, {isLoading}] = useUpdateSiteSettingsMutation();
    const [uploadMedia, {isLoading: isUploading}] = useUploadSiteSettingsMediaMutation();
    const [unlinkMedia, {isLoading: isUnlinking}] = useUnlinkSiteSettingsMediaMutation();
    const [reorderMedia, {isLoading: isReordering}] = useReorderSiteSettingsMediaMutation();
    const [form, setForm] = useState<SiteSettingsInput>(emptyForm);
    const [activeField, setActiveField] = useState<PageField>("homeBodyUa");
    const [imageInsertion, setImageInsertion] = useState<NewsEditorImageInsertion | null>(null);
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
            contactBodyEn: data.contactBodyEn ?? "",
            heroMediaUrls: ""
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

    async function upload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        try {
            const asset = await uploadMedia(file).unwrap();
            if (asset.contentType.startsWith("image/")) {
                insertMedia(asset);
            }
            toast.success(t("mediaUploaded"));
        } catch {
            toast.error(t("mediaUploadError"));
        }
    }

    function insertMedia(asset: MediaAsset) {
        if (asset.contentType.startsWith("image/")) {
            setImageInsertion({
                key: Date.now(),
                src: createSiteMediaPath(asset.id),
                alt: asset.originalFilename
            });
            return;
        }

        if (asset.contentType.startsWith("video/")) {
            const videoLink = `\n\n[${asset.originalFilename}](${createSiteMediaPath(asset.id)})\n\n`;
            setForm((current) => ({...current, [activeField]: `${current[activeField] ?? ""}${videoLink}`}));
        }
    }

    async function remove(asset: MediaAsset) {
        if (!window.confirm(t("mediaRemoveConfirm"))) return;
        try {
            await unlinkMedia(asset.id).unwrap();
            toast.success(t("mediaRemoved"));
        } catch {
            toast.error(t("mediaRemoveError"));
        }
    }

    async function move(asset: MediaAsset, direction: -1 | 1) {
        const index = media.findIndex((item) => item.id === asset.id);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= media.length) return;
        const ids = media.map((item) => item.id);
        [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
        try {
            await reorderMedia(ids).unwrap();
        } catch {
            toast.error(t("mediaReorderError"));
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

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-4">
                    <SettingsPanel title={t("footerTitle")} hint={t("footerHint")}>
                        <TextArea label={t("ua")} value={form.footerBodyUa ?? ""} onChange={(value) => updateField("footerBodyUa", value)} />
                        <TextArea label={t("en")} value={form.footerBodyEn ?? ""} onChange={(value) => updateField("footerBodyEn", value)} />
                    </SettingsPanel>

                    <SettingsPanel title={t("homeTitle")} hint={t("homeHint")}>
                        <TextArea label={t("ua")} value={form.homeIntroUa ?? ""} onChange={(value) => updateField("homeIntroUa", value)} />
                        <TextArea label={t("en")} value={form.homeIntroEn ?? ""} onChange={(value) => updateField("homeIntroEn", value)} />
                    </SettingsPanel>

                    <SettingsPanel title={t("pageContentTitle")} hint={t("pageContentHint")}>
                        <div className="flex flex-wrap gap-2">
                            {pageFields.map((field) => (
                                <button className={activeField === field ? activeTabClass : tabClass} key={field} onClick={() => setActiveField(field)} type="button">
                                    {t(`pageFields.${field}`)}
                                </button>
                            ))}
                        </div>
                        <NewsRichTextEditor
                            ariaLabel={t(`pageFields.${activeField}`)}
                            imageInsertion={imageInsertion}
                            labels={toolbarLabels}
                            onChange={(value) => updateField(activeField, value)}
                            onImageInserted={() => setImageInsertion(null)}
                            value={form[activeField] ?? ""}
                        />
                    </SettingsPanel>
                </div>

                <SiteMediaPanel
                    busy={isUploading || isUnlinking || isReordering}
                    isError={mediaError}
                    isFetching={mediaFetching}
                    media={media}
                    onInsert={insertMedia}
                    onMove={move}
                    onRemove={remove}
                    onUpload={upload}
                    t={t}
                />
            </div>

            <div className="flex justify-end">
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto" disabled={isLoading} onClick={save} type="button">
                    {isLoading ? t("saving") : t("save")}
                </button>
            </div>
        </section>
    );
}

const pageFields: PageField[] = ["homeBodyUa", "homeBodyEn", "aboutBodyUa", "aboutBodyEn", "contactBodyUa", "contactBodyEn"];
const tabClass = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50";
const activeTabClass = "rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white";

function SiteMediaPanel({busy, isError, isFetching, media, onInsert, onMove, onRemove, onUpload, t}: {busy: boolean; isError: boolean; isFetching: boolean; media: MediaAsset[]; onInsert: (asset: MediaAsset) => void; onMove: (asset: MediaAsset, direction: -1 | 1) => void; onRemove: (asset: MediaAsset) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; t: ReturnType<typeof useTranslations<"admin.siteSettings">>}) {
    return (
        <aside className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
            <h2 className="break-words text-base font-semibold text-stone-950">{t("mediaTitle")}</h2>
            <p className="mt-1 break-words text-xs leading-5 text-stone-500">{t("mediaHint")}</p>
            <label className="mt-4 flex cursor-pointer justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-100">
                {busy ? t("mediaBusy") : t("mediaUpload")}
                <input accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" disabled={busy} onChange={onUpload} type="file" />
            </label>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{t("mediaLoadError")}</p> : null}
            {isFetching ? <p className="mt-3 text-xs text-stone-500">{t("mediaLoading")}</p> : null}
            <div className="mt-4 space-y-3">
                {media.map((asset, index) => (
                    <article className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50" key={asset.id}>
                        <div className="aspect-video bg-stone-100">
                            {asset.contentType.startsWith("video/") ? (
                                <video className="h-full w-full object-cover" controls preload="metadata" src={createAdminSiteMediaUrl(asset.id)} />
                            ) : (
                                <img alt={asset.originalFilename} className="h-full w-full object-cover" loading="lazy" src={createAdminSiteMediaUrl(asset.id)} />
                            )}
                        </div>
                        <div className="space-y-2 p-3">
                            <p className="break-words text-xs font-medium text-stone-900">{asset.originalFilename}</p>
                            <div className="flex flex-wrap gap-2">
                                <button className={smallButtonClass} disabled={busy || index === 0} onClick={() => onMove(asset, -1)} type="button">{t("mediaMoveUp")}</button>
                                <button className={smallButtonClass} disabled={busy || index === media.length - 1} onClick={() => onMove(asset, 1)} type="button">{t("mediaMoveDown")}</button>
                                <button className={smallButtonClass} disabled={busy} onClick={() => onInsert(asset)} type="button">{t("mediaInsert")}</button>
                                <button className={dangerButtonClass} disabled={busy} onClick={() => onRemove(asset)} type="button">{t("mediaRemove")}</button>
                            </div>
                        </div>
                    </article>
                ))}
                {!isFetching && media.length === 0 ? <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-5 text-center text-sm text-stone-500">{t("mediaEmpty")}</p> : null}
            </div>
        </aside>
    );
}

const smallButtonClass = "rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300";
const dangerButtonClass = "rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300";

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
