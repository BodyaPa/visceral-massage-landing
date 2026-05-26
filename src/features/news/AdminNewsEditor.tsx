"use client";

import {type ChangeEvent, type ReactNode, useMemo, useRef, useState} from "react";
import ReactMarkdown, {defaultUrlTransform} from "react-markdown";
import remarkGfm from "remark-gfm";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import type {CoverDisplayMode, MediaAsset, NewsAdminItem, NewsStatus} from "@/types/news";
import NewsRichTextEditor, {type NewsEditorImageInsertion, type NewsEditorLabels} from "./NewsRichTextEditor";
import {createAdminMediaUrl, createPublishedMediaPath, resolveAdminMediaUrl} from "./newsMedia";
import styles from "./AdminNewsEditor.module.scss";
import {
    type CreateNewsDto,
    useArchiveNewsMutation,
    useAttachNewsMediaMutation,
    useClearNewsCoverMutation,
    useCreateDraftMutation,
    useDeleteNewsMutation,
    useDeleteMediaMutation,
    useDetachNewsMediaMutation,
    useListAdminNewsQuery,
    useListNewsMediaQuery,
    usePublishNewsMutation,
    useRestoreNewsMutation,
    useSetNewsCoverDisplayModeMutation,
    useSetNewsCoverMutation,
    useUnpublishNewsMutation,
    useUpdateNewsPutMutation,
    useUploadMediaMutation
} from "./news.api";

type NewsDraft = {
    titleUa: string;
    contentUa: string;
    titleEn: string;
    contentEn: string;
};

type TranslationTab = "ua" | "en";
type ViewMode = "edit" | "preview";
type StatusFilter = "ALL" | NewsStatus;

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

function completeness(draft: NewsDraft) {
    const titleUa = Boolean(draft.titleUa.trim());
    const contentUa = Boolean(draft.contentUa.trim());
    const titleEn = Boolean(draft.titleEn.trim());
    const contentEn = Boolean(draft.contentEn.trim());

    return {
        uaComplete: titleUa && contentUa,
        enComplete: titleEn && contentEn,
        publishable: (titleUa && contentUa || titleEn && contentEn)
            && titleUa === contentUa
            && titleEn === contentEn
    };
}

function canDeleteDraft(item: NewsAdminItem) {
    return item.status === "DRAFT" && item.publishedAt === null;
}

function isEmptyDraft(item: NewsAdminItem) {
    return canDeleteDraft(item)
        && !item.titleUa?.trim()
        && !item.contentUa?.trim()
        && !item.titleEn?.trim()
        && !item.contentEn?.trim()
        && !item.coverMediaId;
}

export default function AdminNewsEditor() {
    const t = useTranslations("admin.news.editor");
    const toast = useToast();
    const {data, isLoading} = useListAdminNewsQuery({page: 0, size: 200});
    const [createDraft, {isLoading: isCreating}] = useCreateDraftMutation();
    const [deleteNews, {isLoading: isDeleting}] = useDeleteNewsMutation();
    const [updateNews, {isLoading: isUpdating}] = useUpdateNewsPutMutation();
    const [publishNews, {isLoading: isPublishing}] = usePublishNewsMutation();
    const [unpublishNews, {isLoading: isUnpublishing}] = useUnpublishNewsMutation();
    const [archiveNews, {isLoading: isArchiving}] = useArchiveNewsMutation();
    const [restoreNews, {isLoading: isRestoring}] = useRestoreNewsMutation();
    const [selectedItem, setSelectedItem] = useState<NewsAdminItem | null>(null);
    const {data: linkedMedia = [], isLoading: isMediaLoading} = useListNewsMediaQuery(selectedItem?.id ?? 0, {skip: !selectedItem});
    const [uploadMedia, {isLoading: isUploading}] = useUploadMediaMutation();
    const [attachNewsMedia, {isLoading: isAttaching}] = useAttachNewsMediaMutation();
    const [detachNewsMedia, {isLoading: isDetaching}] = useDetachNewsMediaMutation();
    const [setNewsCover, {isLoading: isSettingCover}] = useSetNewsCoverMutation();
    const [clearNewsCover, {isLoading: isClearingCover}] = useClearNewsCoverMutation();
    const [setNewsCoverDisplayMode, {isLoading: isChangingCoverDisplayMode}] = useSetNewsCoverDisplayModeMutation();
    const [deleteMedia] = useDeleteMediaMutation();
    const [draft, setDraft] = useState<NewsDraft>(emptyDraft);
    const [activeTab, setActiveTab] = useState<TranslationTab>("ua");
    const [viewMode, setViewMode] = useState<ViewMode>("edit");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [search, setSearch] = useState("");
    const [imageInsertion, setImageInsertion] = useState<NewsEditorImageInsertion | null>(null);
    const [dirty, setDirty] = useState(false);
    const createLock = useRef(false);
    const toolbarLabels: NewsEditorLabels = {
        bold: t("format.bold"),
        italic: t("format.italic"),
        strike: t("format.strike"),
        inlineCode: t("format.inlineCode"),
        paragraph: t("format.paragraph"),
        headingTwo: t("format.headingTwo"),
        headingThree: t("format.headingThree"),
        bulletList: t("format.bulletList"),
        orderedList: t("format.orderedList"),
        blockquote: t("format.blockquote"),
        divider: t("format.divider"),
        link: t("format.link"),
        unlink: t("format.unlink"),
        linkPrompt: t("format.linkPrompt"),
        invalidLink: t("format.invalidLink"),
        undo: t("format.undo"),
        redo: t("format.redo")
    };

    const state = completeness(draft);
    const changingStatus = isPublishing || isUnpublishing || isArchiving || isRestoring;
    const saving = isUpdating || changingStatus || isDeleting;
    const changingMedia = isUploading || isAttaching || isDetaching || isSettingCover || isClearingCover || isChangingCoverDisplayMode;
    const archived = selectedItem?.status === "ARCHIVED";
    const news = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return (data?.content ?? []).filter((item) => {
            if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
            if (!normalizedSearch) return true;
            return [item.titleUa, item.titleEn].some((title) => title?.toLocaleLowerCase().includes(normalizedSearch));
        });
    }, [data?.content, search, statusFilter]);

    function openNews(item: NewsAdminItem) {
        setSelectedItem(item);
        setDraft(toDraft(item));
        setActiveTab(item.titleUa || !item.titleEn ? "ua" : "en");
        setViewMode("edit");
        setImageInsertion(null);
        setDirty(false);
    }

    function selectNews(item: NewsAdminItem) {
        if (dirty && !window.confirm(t("discardConfirm"))) {
            return;
        }
        openNews(item);
    }

    function setField(field: keyof NewsDraft, value: string) {
        setDraft((current) => ({...current, [field]: value}));
        setDirty(true);
    }

    async function addDraft() {
        if (createLock.current || isCreating) return;
        if (dirty && !window.confirm(t("discardConfirm"))) {
            return;
        }

        const reusableDraft = (data?.content ?? []).find(isEmptyDraft);
        if (reusableDraft) {
            openNews(reusableDraft);
            toast.success(t("emptyDraftReused"));
            return;
        }

        createLock.current = true;
        try {
            const created = await createDraft().unwrap();
            openNews(created);
            toast.success(t("created"));
        } catch {
            toast.error(t("createError"));
        } finally {
            createLock.current = false;
        }
    }

    async function removeDraft() {
        if (!selectedItem || !canDeleteDraft(selectedItem) || !window.confirm(t("deleteDraftConfirm"))) {
            return;
        }

        try {
            await deleteNews(selectedItem.id).unwrap();
            const nextItem = (data?.content ?? []).find((item) => item.id !== selectedItem.id);
            if (nextItem) {
                openNews(nextItem);
            } else {
                setSelectedItem(null);
                setDraft(emptyDraft);
                setActiveTab("ua");
                setViewMode("edit");
                setImageInsertion(null);
                setDirty(false);
            }
            toast.success(t("draftDeleted"));
        } catch {
            toast.error(t("deleteError"));
        }
    }

    async function saveContent(showToast = true) {
        if (!selectedItem) return null;
        if (selectedItem.status === "PUBLISHED" && !state.publishable) {
            toast.error(t("publishRequiresTranslation"));
            return null;
        }

        try {
            const saved = await updateNews({id: selectedItem.id, body: toPayload(draft)}).unwrap();
            setSelectedItem(saved);
            setDraft(toDraft(saved));
            setDirty(false);
            if (showToast) toast.success(t(selectedItem.status === "DRAFT" ? "draftSaved" : "updated"));
            return saved;
        } catch {
            toast.error(t("saveError"));
            return null;
        }
    }

    async function publish() {
        if (!selectedItem || !state.publishable) {
            toast.error(t("publishRequiresTranslation"));
            return;
        }

        const saved = dirty ? await saveContent(false) : selectedItem;
        if (!saved) return;

        try {
            const published = await publishNews(saved.id).unwrap();
            setSelectedItem(published);
            toast.success(t("published"));
        } catch {
            toast.error(t("statusError"));
        }
    }

    async function changeStatus(action: "unpublish" | "archive" | "restore") {
        if (!selectedItem) return;
        if (dirty && action !== "restore") {
            toast.error(t("saveBeforeStatusChange"));
            return;
        }

        try {
            const updated = action === "unpublish"
                ? await unpublishNews(selectedItem.id).unwrap()
                : action === "archive"
                    ? await archiveNews(selectedItem.id).unwrap()
                    : await restoreNews(selectedItem.id).unwrap();
            setSelectedItem(updated);
            setDraft(toDraft(updated));
            setDirty(false);
            setViewMode(action === "restore" ? "edit" : viewMode);
            toast.success(t(`statusResults.${action}`));
        } catch {
            toast.error(t("statusError"));
        }
    }

    async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !selectedItem || archived) return;

        let uploaded: MediaAsset | null = null;
        let attached = false;
        try {
            uploaded = await uploadMedia(file).unwrap();
            await attachNewsMedia({newsId: selectedItem.id, mediaId: uploaded.id}).unwrap();
            attached = true;
            const updated = await setNewsCover({newsId: selectedItem.id, mediaId: uploaded.id}).unwrap();
            setSelectedItem(updated);
            toast.success(t("media.coverUploaded"));
        } catch {
            if (uploaded && !attached) {
                try {
                    await deleteMedia(uploaded.id).unwrap();
                } catch {
                    // An unlinked private file remains inaccessible publicly if cleanup cannot complete.
                }
            }
            toast.error(t("media.uploadError"));
        }
    }

    async function uploadInlineImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !selectedItem || archived) return;

        let uploaded: MediaAsset | null = null;
        try {
            uploaded = await uploadMedia(file).unwrap();
            const attached = await attachNewsMedia({newsId: selectedItem.id, mediaId: uploaded.id}).unwrap();
            insertImage(attached);
            toast.success(t("media.inlineUploaded"));
        } catch {
            if (uploaded) {
                try {
                    await deleteMedia(uploaded.id).unwrap();
                } catch {
                    // The asset may already be attached; it remains controlled in the media library.
                }
            }
            toast.error(t("media.uploadError"));
        }
    }

    async function selectCover(asset: MediaAsset) {
        if (!selectedItem || archived || !asset.contentType.startsWith("image/")) return;
        try {
            const updated = await setNewsCover({newsId: selectedItem.id, mediaId: asset.id}).unwrap();
            setSelectedItem(updated);
            toast.success(t("media.coverSet"));
        } catch {
            toast.error(t("media.coverError"));
        }
    }

    async function removeCover() {
        if (!selectedItem || archived) return;
        try {
            const updated = await clearNewsCover(selectedItem.id).unwrap();
            setSelectedItem(updated);
            toast.success(t("media.coverRemoved"));
        } catch {
            toast.error(t("media.coverError"));
        }
    }

    async function changeCoverDisplayMode(displayMode: CoverDisplayMode) {
        if (!selectedItem || archived || selectedItem.coverDisplayMode === displayMode) return;
        try {
            const updated = await setNewsCoverDisplayMode({newsId: selectedItem.id, displayMode}).unwrap();
            setSelectedItem(updated);
            toast.success(t("media.displayModeSaved"));
        } catch {
            toast.error(t("media.displayModeError"));
        }
    }

    function insertImage(asset: MediaAsset) {
        if (!selectedItem || archived || !asset.contentType.startsWith("image/")) return;
        setImageInsertion({
            key: Date.now(),
            src: createPublishedMediaPath(selectedItem.id, asset.id),
            alt: asset.originalFilename
        });
        setViewMode("edit");
        setDirty(true);
    }

    async function detachImage(asset: MediaAsset) {
        if (!selectedItem || archived || !window.confirm(t("media.detachConfirm"))) return;
        try {
            await detachNewsMedia({newsId: selectedItem.id, mediaId: asset.id}).unwrap();
            if (selectedItem.coverMediaId === asset.id) {
                setSelectedItem({...selectedItem, coverMediaId: null});
            }
            toast.success(t("media.detached"));
        } catch {
            toast.error(t("media.detachError"));
        }
    }

    return (
        <div className="space-y-4">
            <ActionBar
                archived={archived}
                busy={saving}
                dirty={dirty}
                item={selectedItem}
                onArchive={() => changeStatus("archive")}
                onDeleteDraft={removeDraft}
                onPublish={publish}
                onRestore={() => changeStatus("restore")}
                onSave={() => saveContent()}
                onTogglePreview={() => setViewMode((current) => current === "edit" ? "preview" : "edit")}
                onUnpublish={() => changeStatus("unpublish")}
                t={t}
                viewMode={viewMode}
            />

            <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(620px,1fr)_280px]">
                <NewsSidebar
                    busy={isCreating}
                    filter={statusFilter}
                    isLoading={isLoading}
                    news={news}
                    onCreate={addDraft}
                    onFilter={setStatusFilter}
                    onSearch={setSearch}
                    onSelect={selectNews}
                    search={search}
                    selectedId={selectedItem?.id ?? null}
                    t={t}
                />

                <main className="min-h-[38rem] min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                    {!selectedItem ? (
                        <EmptySelection busy={isCreating} onCreate={addDraft} t={t} />
                    ) : viewMode === "preview" || archived ? (
                        <PreviewPanel key={`${viewMode}-${activeTab}-${selectedItem.id}`} activeTab={activeTab} draft={draft} item={selectedItem} onSelectTab={setActiveTab} state={state} t={t} />
                    ) : (
                        <ContentEditor
                            key={`${viewMode}-${activeTab}-${selectedItem.id}`}
                            activeTab={activeTab}
                            draft={draft}
                            imageInsertion={imageInsertion}
                            onImageInserted={() => setImageInsertion(null)}
                            onSelectTab={setActiveTab}
                            onSetField={setField}
                            state={state}
                            t={t}
                            toolbarLabels={toolbarLabels}
                        />
                    )}
                </main>

                <Inspector
                    archived={archived}
                    assets={linkedMedia}
                    changingMedia={changingMedia}
                    isLoading={isMediaLoading}
                    item={selectedItem}
                    onDetach={detachImage}
                    onInsert={insertImage}
                    onRemoveCover={removeCover}
                    onSelectCoverDisplayMode={changeCoverDisplayMode}
                    onSelectCover={selectCover}
                    onUploadInline={uploadInlineImage}
                    onUpload={uploadCover}
                    state={state}
                    t={t}
                />
            </div>
        </div>
    );
}

type TranslationState = ReturnType<typeof completeness>;
type T = ReturnType<typeof useTranslations<"admin.news.editor">>;

function ActionBar({archived, busy, dirty, item, onArchive, onDeleteDraft, onPublish, onRestore, onSave, onTogglePreview, onUnpublish, t, viewMode}: {
    archived: boolean;
    busy: boolean;
    dirty: boolean;
    item: NewsAdminItem | null;
    onArchive: () => void;
    onDeleteDraft: () => void;
    onPublish: () => void;
    onRestore: () => void;
    onSave: () => void;
    onTogglePreview: () => void;
    onUnpublish: () => void;
    t: T;
    viewMode: ViewMode;
}) {
    return (
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("workspace")}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="max-w-full truncate text-lg font-semibold text-stone-900">{item?.titleUa?.trim() || item?.titleEn?.trim() || t("untitled")}</h1>
                    {item ? <StatusBadge status={item.status} t={t} /> : null}
                    {dirty ? <span className="text-xs text-stone-500">{t("unsaved")}</span> : null}
                </div>
            </div>
            {item ? (
                <div className="flex flex-wrap justify-end gap-2">
                    {!archived ? (
                        <>
                            <ActionButton disabled={busy} onClick={onSave} primary>
                                {busy ? t("saving") : t(item.status === "DRAFT" ? "saveDraft" : "saveChanges")}
                            </ActionButton>
                            <ActionButton disabled={busy} onClick={onTogglePreview}>
                                {t(viewMode === "preview" ? "editMode" : "preview")}
                            </ActionButton>
                        </>
                    ) : null}
                    {item.status === "DRAFT" ? <ActionButton disabled={busy} onClick={onPublish}>{t("publish")}</ActionButton> : null}
                    {canDeleteDraft(item) ? <ActionButton danger disabled={busy} onClick={onDeleteDraft}>{t("deleteDraft")}</ActionButton> : null}
                    {item.status === "PUBLISHED" ? <ActionButton disabled={busy} onClick={onUnpublish}>{t("unpublish")}</ActionButton> : null}
                    {!archived ? <ActionButton danger disabled={busy} onClick={onArchive}>{t("archive")}</ActionButton> : null}
                    {archived ? <ActionButton primary disabled={busy} onClick={onRestore}>{t("restore")}</ActionButton> : null}
                </div>
            ) : null}
        </header>
    );
}

function NewsSidebar({busy, filter, isLoading, news, onCreate, onFilter, onSearch, onSelect, search, selectedId, t}: {
    busy: boolean;
    filter: StatusFilter;
    isLoading: boolean;
    news: NewsAdminItem[];
    onCreate: () => void;
    onFilter: (status: StatusFilter) => void;
    onSearch: (value: string) => void;
    onSelect: (item: NewsAdminItem) => void;
    search: string;
    selectedId: number | null;
    t: T;
}) {
    const filters: StatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

    return (
        <aside className="min-w-0 space-y-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm lg:sticky lg:top-[84px]">
            <button
                className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60"
                disabled={busy}
                onClick={onCreate}
                type="button"
            >
                + {busy ? t("creating") : t("new")}
            </button>
            <input
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-stone-400"
                onChange={(event) => onSearch(event.target.value)}
                placeholder={t("search")}
                type="search"
                value={search}
            />
            <div className="flex flex-wrap gap-1">
                {filters.map((item) => (
                    <button
                        className={`rounded-md px-2 py-1 text-xs font-medium ${item === filter ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                        key={item}
                        onClick={() => onFilter(item)}
                        type="button"
                    >
                        {t(`filters.${item.toLowerCase()}`)}
                    </button>
                ))}
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pt-1 lg:max-h-[calc(100vh-295px)]">
                {isLoading ? <p className="p-2 text-sm text-stone-500">{t("loading")}</p> : null}
                {!isLoading && news.length === 0 ? <p className="p-2 text-sm text-stone-500">{t("empty")}</p> : null}
                {news.map((item) => (
                    <button
                        className={`min-w-0 w-full rounded-lg border p-3 text-left transition ${selectedId === item.id ? "border-stone-800 bg-stone-50" : "border-stone-200 hover:bg-stone-50"}`}
                        key={item.id}
                        onClick={() => onSelect(item)}
                        type="button"
                    >
                        <p className="line-clamp-2 overflow-hidden text-sm font-medium text-stone-900">{item.titleUa?.trim() || item.titleEn?.trim() || t("untitled")}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                            <StatusBadge status={item.status} t={t} />
                            <LanguageBadge complete={Boolean(item.titleUa?.trim() && item.contentUa?.trim())} locale="UA" t={t} />
                            <LanguageBadge complete={Boolean(item.titleEn?.trim() && item.contentEn?.trim())} locale="EN" t={t} />
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    );
}

function ContentEditor({activeTab, draft, imageInsertion, onImageInserted, onSelectTab, onSetField, state, t, toolbarLabels}: {
    activeTab: TranslationTab;
    draft: NewsDraft;
    imageInsertion: NewsEditorImageInsertion | null;
    onImageInserted: () => void;
    onSelectTab: (tab: TranslationTab) => void;
    onSetField: (field: keyof NewsDraft, value: string) => void;
    state: TranslationState;
    t: T;
    toolbarLabels: NewsEditorLabels;
}) {
    const title = activeTab === "ua" ? draft.titleUa : draft.titleEn;
    const content = activeTab === "ua" ? draft.contentUa : draft.contentEn;
    const titleField = activeTab === "ua" ? "titleUa" : "titleEn";
    const contentField = activeTab === "ua" ? "contentUa" : "contentEn";

    return (
        <section className={`${styles.panel} min-h-[clamp(35rem,60vh,47.5rem)] min-w-0 space-y-4`}>
            <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3" role="tablist" aria-label={t("versions")}>
                <LanguageTab active={activeTab === "ua"} complete={state.uaComplete} label={t("ukrainian")} onSelect={() => onSelectTab("ua")} />
                <LanguageTab active={activeTab === "en"} complete={state.enComplete} label={t("english")} onSelect={() => onSelectTab("en")} />
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-stone-700">
                <span>{t(activeTab === "ua" ? "titleUa" : "titleEn")}</span>
                <input
                    className="w-full rounded-lg border border-stone-200 px-4 py-3 text-xl font-medium outline-none focus:border-stone-400"
                    maxLength={255}
                    onChange={(event) => onSetField(titleField, event.target.value)}
                    type="text"
                    value={title}
                />
            </label>
            <div className="space-y-1.5 text-sm font-medium text-stone-700">
                <span>{t(activeTab === "ua" ? "contentUa" : "contentEn")}</span>
                <NewsRichTextEditor
                    ariaLabel={t(activeTab === "ua" ? "contentUa" : "contentEn")}
                    imageInsertion={imageInsertion}
                    labels={toolbarLabels}
                    onChange={(value) => onSetField(contentField, value)}
                    onImageInserted={onImageInserted}
                    value={content}
                />
            </div>
        </section>
    );
}

function PreviewPanel({activeTab, draft, item, onSelectTab, state, t}: {
    activeTab: TranslationTab;
    draft: NewsDraft;
    item: NewsAdminItem;
    onSelectTab: (tab: TranslationTab) => void;
    state: TranslationState;
    t: T;
}) {
    const title = activeTab === "ua" ? draft.titleUa : draft.titleEn;
    const content = activeTab === "ua" ? draft.contentUa : draft.contentEn;

    return (
        <section className={`${styles.panel} min-h-[clamp(35rem,60vh,47.5rem)] min-w-0 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
                <h2 className="text-sm font-medium text-stone-500">{t("previewTitle")}</h2>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("versions")}>
                    <LanguageTab active={activeTab === "ua"} complete={state.uaComplete} label="UA" onSelect={() => onSelectTab("ua")} />
                    <LanguageTab active={activeTab === "en"} complete={state.enComplete} label="EN" onSelect={() => onSelectTab("en")} />
                </div>
            </div>
            {item.coverMediaId ? (
                <div className={`overflow-hidden rounded-xl bg-stone-100 ${item.coverDisplayMode === "FIT" ? "flex max-h-80 justify-center p-3" : "h-64"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private draft cover is loaded through ADMIN media preview. */}
                    <img alt="" className={item.coverDisplayMode === "FIT" ? "max-h-72 max-w-full rounded-lg object-contain" : "h-full w-full object-cover"} src={createAdminMediaUrl(item.coverMediaId)} />
                </div>
            ) : null}
            <h2 className="text-3xl font-semibold text-stone-900">{title || t("untitled")}</h2>
            {content ? (
                <div className="prose max-w-none text-stone-800">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(url) => defaultUrlTransform(resolveAdminMediaUrl(url))}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className="text-sm text-stone-500">{t("emptyPreview")}</p>
            )}
        </section>
    );
}

function Inspector({archived, assets, changingMedia, isLoading, item, onDetach, onInsert, onRemoveCover, onSelectCover, onSelectCoverDisplayMode, onUpload, onUploadInline, state, t}: {
    archived: boolean;
    assets: MediaAsset[];
    changingMedia: boolean;
    isLoading: boolean;
    item: NewsAdminItem | null;
    onDetach: (asset: MediaAsset) => void;
    onInsert: (asset: MediaAsset) => void;
    onRemoveCover: () => void;
    onSelectCover: (asset: MediaAsset) => void;
    onSelectCoverDisplayMode: (displayMode: CoverDisplayMode) => void;
    onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    onUploadInline: (event: ChangeEvent<HTMLInputElement>) => void;
    state: TranslationState;
    t: T;
}) {
    if (!item) {
        return <aside className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500 lg:col-start-2 2xl:col-start-auto">{t("inspectorEmpty")}</aside>;
    }

    const cover = assets.find((asset) => asset.id === item.coverMediaId);

    return (
        <aside className="min-w-0 space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:col-start-2 2xl:col-start-auto 2xl:sticky 2xl:top-[84px]">
            <section className="space-y-2 border-b border-stone-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("settings")}</p>
                <StatusBadge status={item.status} t={t} />
                <InfoRow label={t("dates.created")} value={formatDate(item.createdAt)} />
                <InfoRow label={t("dates.updated")} value={formatDate(item.updatedAt)} />
                {item.publishedAt ? <InfoRow label={t("dates.published")} value={formatDate(item.publishedAt)} /> : null}
            </section>
            <section className="space-y-2 border-b border-stone-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("translations")}</p>
                <LanguageStatus complete={state.uaComplete} label="UA" t={t} />
                <LanguageStatus complete={state.enComplete} label="EN" t={t} />
            </section>
            <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("media.cover")}</p>
                {item.coverMediaId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private draft cover is loaded through ADMIN media preview.
                    <img alt="" className={`h-36 w-full rounded-lg border border-stone-200 ${item.coverDisplayMode === "FIT" ? "bg-stone-50 object-contain p-2" : "object-cover"}`} src={createAdminMediaUrl(item.coverMediaId)} />
                ) : (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-xs text-stone-500">
                        {t("media.noCover")}
                    </div>
                )}
                {!archived ? (
                    <div className="flex flex-wrap gap-2">
                        <label className={`cursor-pointer rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-medium hover:bg-stone-50 ${changingMedia ? "pointer-events-none opacity-50" : ""}`}>
                            {item.coverMediaId ? t("media.replace") : t("media.upload")}
                            <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={changingMedia} onChange={onUpload} type="file" />
                        </label>
                        {cover ? <SmallButton disabled={changingMedia} onClick={() => onInsert(cover)}>{t("media.insert")}</SmallButton> : null}
                        {item.coverMediaId ? <SmallButton danger disabled={changingMedia} onClick={onRemoveCover}>{t("media.removeCover")}</SmallButton> : null}
                    </div>
                ) : null}
                {item.coverMediaId ? (
                    <div className="space-y-2 border-t border-stone-100 pt-3">
                        <p className="text-xs font-medium text-stone-600">{t("media.displayMode")}</p>
                        <div className="flex flex-wrap gap-1.5">
                            <ModeButton
                                active={item.coverDisplayMode === "FILL"}
                                disabled={archived || changingMedia}
                                onClick={() => onSelectCoverDisplayMode("FILL")}
                            >
                                {t("media.displayFill")}
                            </ModeButton>
                            <ModeButton
                                active={item.coverDisplayMode === "FIT"}
                                disabled={archived || changingMedia}
                                onClick={() => onSelectCoverDisplayMode("FIT")}
                            >
                                {t("media.displayFit")}
                            </ModeButton>
                        </div>
                        <p className="text-[11px] leading-4 text-stone-500">{t("media.displayHint")}</p>
                    </div>
                ) : null}
            </section>
            <section className="space-y-2 border-t border-stone-100 pt-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-stone-500">{t("media.library")}</p>
                    {!archived ? (
                        <label className={`cursor-pointer rounded border border-stone-200 px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-50 ${changingMedia ? "pointer-events-none opacity-50" : ""}`}>
                            {t("media.uploadInline")}
                            <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={changingMedia} onChange={onUploadInline} type="file" />
                        </label>
                    ) : null}
                </div>
                {isLoading ? <p className="text-xs text-stone-500">{t("media.loading")}</p> : null}
                {!isLoading && assets.length === 0 ? <p className="text-xs text-stone-500">{t("media.empty")}</p> : null}
                {assets.map((asset) => (
                    <div className="space-y-2 rounded-lg border border-stone-200 p-2" key={asset.id}>
                        <p className="truncate text-xs font-medium text-stone-700">{asset.originalFilename}</p>
                        {!archived ? (
                            <div className="flex flex-wrap gap-1">
                                <SmallButton disabled={changingMedia || !asset.contentType.startsWith("image/")} onClick={() => onInsert(asset)}>{t("media.insert")}</SmallButton>
                                {item.coverMediaId !== asset.id && asset.contentType.startsWith("image/") ? (
                                    <SmallButton disabled={changingMedia} onClick={() => onSelectCover(asset)}>{t("media.makeCover")}</SmallButton>
                                ) : null}
                                <SmallButton danger disabled={changingMedia} onClick={() => onDetach(asset)}>{t("media.detach")}</SmallButton>
                            </div>
                        ) : null}
                    </div>
                ))}
            </section>
        </aside>
    );
}

function EmptySelection({busy, onCreate, t}: {busy: boolean; onCreate: () => void; t: T}) {
    return (
        <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm text-stone-500">{t("selectHint")}</p>
            <ActionButton disabled={busy} onClick={onCreate} primary>{`+ ${busy ? t("creating") : t("new")}`}</ActionButton>
        </div>
    );
}

function StatusBadge({status, t}: {status: NewsStatus; t: T}) {
    const style = status === "PUBLISHED"
        ? "bg-emerald-50 text-emerald-700"
        : status === "ARCHIVED"
            ? "bg-stone-200 text-stone-600"
            : "bg-amber-50 text-amber-700";
    return <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{t(`statuses.${status.toLowerCase()}`)}</span>;
}

function LanguageBadge({complete, locale, t}: {complete: boolean; locale: string; t: T}) {
    return <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] ${complete ? "bg-stone-100 text-stone-600" : "bg-amber-50 text-amber-700"}`}>{complete ? locale : t("missingLanguage", {locale})}</span>;
}

function LanguageStatus({complete, label, t}: {complete: boolean; label: string; t: T}) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-stone-50 px-2.5 py-2 text-sm">
            <span>{label}</span>
            <span className={`truncate text-right ${complete ? "text-emerald-700" : "text-amber-700"}`}>{complete ? t("complete") : t("incomplete")}</span>
        </div>
    );
}

function LanguageTab({active, complete, label, onSelect}: {active: boolean; complete: boolean; label: string; onSelect: () => void}) {
    return (
        <button
            aria-selected={active}
            className={`inline-flex max-w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            onClick={onSelect}
            role="tab"
            type="button"
        >
            {label}
            <span className={`h-2 w-2 rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
        </button>
    );
}

function ActionButton({children, danger = false, disabled = false, onClick, primary = false}: {
    children: ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    primary?: boolean;
}) {
    const style = primary
        ? "border-stone-900 bg-stone-900 text-white hover:bg-stone-700"
        : danger
            ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
            : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100";
    return <button className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${style}`} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

function SmallButton({children, danger = false, disabled = false, onClick}: {
    children: ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`rounded border px-2 py-1 text-[11px] disabled:opacity-45 ${danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}

function ModeButton({active, children, disabled, onClick}: {
    active: boolean;
    children: ReactNode;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            aria-pressed={active}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}

function InfoRow({label, value}: {label: string; value: string}) {
    return <div className="flex min-w-0 justify-between gap-2 text-xs text-stone-500"><span className="shrink-0">{label}</span><span className="min-w-0 truncate text-right">{value}</span></div>;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {dateStyle: "medium"}).format(new Date(value));
}
