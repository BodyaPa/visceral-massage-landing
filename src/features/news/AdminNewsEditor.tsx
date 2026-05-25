"use client";

import {type FormEvent, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import type {NewsAdminItem} from "@/types/news";
import NewsRichTextEditor from "./NewsRichTextEditor";
import {
    type CreateNewsDto,
    useCreateNewsMutation,
    useDeleteNewsMutation,
    useListAdminNewsQuery,
    useUpdateNewsPutMutation
} from "./news.api";

type NewsDraft = {
    titleUa: string;
    contentUa: string;
    titleEn: string;
    contentEn: string;
};

type TranslationTab = "ua" | "en";

const emptyDraft: NewsDraft = {
    titleUa: "",
    contentUa: "",
    titleEn: "",
    contentEn: ""
};

function toDraft(item: NewsAdminItem): NewsDraft {
    return {
        titleUa: item.titleUa ?? "",
        contentUa: item.contentUa ?? "",
        titleEn: item.titleEn ?? "",
        contentEn: item.contentEn ?? ""
    };
}

function toPayload(draft: NewsDraft): CreateNewsDto {
    return {
        titleUa: draft.titleUa.trim() || undefined,
        contentUa: draft.contentUa.trim() ? draft.contentUa : undefined,
        titleEn: draft.titleEn.trim() || undefined,
        contentEn: draft.contentEn.trim() ? draft.contentEn : undefined
    };
}

function hasText(value?: string) {
    return Boolean(value);
}

export default function AdminNewsEditor() {
    const t = useTranslations("admin.news.editor");
    const toast = useToast();
    const {data, isLoading} = useListAdminNewsQuery({page: 0, size: 100});
    const [createNews, {isLoading: isCreating}] = useCreateNewsMutation();
    const [updateNews, {isLoading: isUpdating}] = useUpdateNewsPutMutation();
    const [deleteNews, {isLoading: isDeleting}] = useDeleteNewsMutation();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<NewsDraft>(emptyDraft);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TranslationTab>("ua");

    const news = data?.content ?? [];
    const submitting = isCreating || isUpdating || isDeleting;

    function createNew() {
        setSelectedId(null);
        setDraft(emptyDraft);
        setError(null);
        setActiveTab("ua");
    }

    function selectNews(item: NewsAdminItem) {
        setSelectedId(item.id);
        setDraft(toDraft(item));
        setError(null);
        setActiveTab(item.titleUa || !item.titleEn ? "ua" : "en");
    }

    function setField(field: keyof NewsDraft, value: string) {
        setDraft((current) => ({...current, [field]: value}));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const payload = toPayload(draft);
        const uaComplete = hasText(payload.titleUa) && hasText(payload.contentUa);
        const enComplete = hasText(payload.titleEn) && hasText(payload.contentEn);
        const uaPartial = hasText(payload.titleUa) !== hasText(payload.contentUa);
        const enPartial = hasText(payload.titleEn) !== hasText(payload.contentEn);

        if (uaPartial || enPartial || (!uaComplete && !enComplete)) {
            const message = t("translationRequired");
            setError(message);
            toast.error(message);
            return;
        }

        setError(null);

        try {
            const saved = selectedId === null
                ? await createNews(payload).unwrap()
                : await updateNews({id: selectedId, body: payload}).unwrap();

            setSelectedId(saved.id);
            setDraft(toDraft(saved));
            toast.success(t(selectedId === null ? "created" : "updated"));
        } catch {
            const message = t("saveError");
            setError(message);
            toast.error(message);
        }
    }

    async function remove() {
        if (selectedId === null || !window.confirm(t("deleteConfirm"))) {
            return;
        }

        try {
            await deleteNews(selectedId).unwrap();
            createNew();
            toast.success(t("deleted"));
        } catch {
            toast.error(t("deleteError"));
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <aside className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <button
                    className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white"
                    onClick={createNew}
                    type="button"
                >
                    {t("new")}
                </button>

                {isLoading ? <p className="text-sm text-stone-600">{t("loading")}</p> : null}
                {!isLoading && news.length === 0 ? <p className="text-sm text-stone-600">{t("empty")}</p> : null}

                <div className="space-y-2">
                    {news.map((item) => (
                        <button
                            className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                                selectedId === item.id
                                    ? "border-stone-900 bg-white"
                                    : "border-stone-200 bg-stone-100 hover:bg-white"
                            }`}
                            key={item.id}
                            onClick={() => selectNews(item)}
                            type="button"
                        >
                            <span className="block font-medium text-stone-900">
                                {item.titleUa ?? item.titleEn ?? t("untitled")}
                            </span>
                            <span className="block text-xs text-stone-500">
                                {item.titleUa ? "UA" : ""}{item.titleUa && item.titleEn ? " / " : ""}{item.titleEn ? "EN" : ""}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            <form className="space-y-5 rounded-xl border border-stone-200 bg-white p-5" onSubmit={submit}>
                <h2 className="text-xl font-semibold">
                    {selectedId === null ? t("createTitle") : t("editTitle")}
                </h2>

                <div className="flex gap-2 border-b border-stone-200 pb-3" role="tablist" aria-label={t("versions")}>
                    <LanguageTab
                        active={activeTab === "ua"}
                        filled={Boolean(draft.titleUa.trim() && draft.contentUa.trim())}
                        label={t("ukrainian")}
                        onSelect={() => setActiveTab("ua")}
                    />
                    <LanguageTab
                        active={activeTab === "en"}
                        filled={Boolean(draft.titleEn.trim() && draft.contentEn.trim())}
                        label={t("english")}
                        onSelect={() => setActiveTab("en")}
                    />
                </div>

                {activeTab === "ua" ? (
                    <TranslationFields
                        content={draft.contentUa}
                        contentLabel={t("contentUa")}
                        language={t("ukrainian")}
                        onContentChange={(value) => setField("contentUa", value)}
                        onTitleChange={(value) => setField("titleUa", value)}
                        title={draft.titleUa}
                        titleLabel={t("titleUa")}
                        toolbarLabels={{
                            bold: t("format.bold"),
                            italic: t("format.italic"),
                            heading: t("format.heading"),
                            bulletList: t("format.bulletList"),
                            orderedList: t("format.orderedList"),
                            blockquote: t("format.blockquote")
                        }}
                    />
                ) : (
                    <TranslationFields
                        content={draft.contentEn}
                        contentLabel={t("contentEn")}
                        language={t("english")}
                        onContentChange={(value) => setField("contentEn", value)}
                        onTitleChange={(value) => setField("titleEn", value)}
                        title={draft.titleEn}
                        titleLabel={t("titleEn")}
                        toolbarLabels={{
                            bold: t("format.bold"),
                            italic: t("format.italic"),
                            heading: t("format.heading"),
                            bulletList: t("format.bulletList"),
                            orderedList: t("format.orderedList"),
                            blockquote: t("format.blockquote")
                        }}
                    />
                )}

                <p className="text-sm text-stone-600">{t("hint")}</p>
                {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}

                <div className="flex flex-wrap gap-3">
                    <button
                        className="rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                        disabled={submitting}
                        type="submit"
                    >
                        {submitting ? t("saving") : t("save")}
                    </button>
                    {selectedId !== null ? (
                        <button
                            className="rounded-md border border-red-300 px-5 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
                            disabled={submitting}
                            onClick={remove}
                            type="button"
                        >
                            {t("delete")}
                        </button>
                    ) : null}
                </div>
            </form>
        </div>
    );
}

function LanguageTab({active, filled, label, onSelect}: {
    active: boolean;
    filled: boolean;
    label: string;
    onSelect: () => void;
}) {
    return (
        <button
            aria-selected={active}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
            onClick={onSelect}
            role="tab"
            type="button"
        >
            {label}
            {filled ? <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" /> : null}
        </button>
    );
}

type TranslationFieldsProps = {
    language: string;
    titleLabel: string;
    contentLabel: string;
    title: string;
    content: string;
    onTitleChange: (value: string) => void;
    onContentChange: (value: string) => void;
    toolbarLabels: {
        bold: string;
        italic: string;
        heading: string;
        bulletList: string;
        orderedList: string;
        blockquote: string;
    };
};

function TranslationFields(props: TranslationFieldsProps) {
    return (
        <fieldset className="space-y-3 rounded-lg bg-stone-50 p-4">
            <legend className="px-1 text-sm font-semibold text-stone-800">{props.language}</legend>
            <label className="block space-y-1 text-sm font-medium text-stone-800">
                <span>{props.titleLabel}</span>
                <input
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-normal"
                    maxLength={255}
                    onChange={(event) => props.onTitleChange(event.target.value)}
                    type="text"
                    value={props.title}
                />
            </label>
            <div className="block space-y-1 text-sm font-medium text-stone-800">
                <span>{props.contentLabel}</span>
                <NewsRichTextEditor
                    ariaLabel={props.contentLabel}
                    labels={props.toolbarLabels}
                    onChange={props.onContentChange}
                    value={props.content}
                />
            </div>
        </fieldset>
    );
}
