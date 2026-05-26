import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/shared/api/baseQuery";
import type { Locale } from "@/i18n";
import type { CoverDisplayMode, MediaAsset, NewsAdminItem, NewsItem, NewsId, PageResponse } from "@/types/news";

export interface CreateNewsDto {
    titleUa?: string;
    contentUa?: string;
    titleEn?: string;
    contentEn?: string;
}
export type UpdateNewsDto = CreateNewsDto;

export const newsApi = createApi({
    reducerPath: "newsApi",
    baseQuery,
    tagTypes: ["News", "Media"],
    endpoints: (build) => ({
        listNews: build.query<PageResponse<NewsItem>, { lang: Locale; page?: number; size?: number }>({
            query: ({ lang, page = 0, size = 10 }) => `/news?lang=${lang}&page=${page}&size=${size}`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((item) => ({ type: "News" as const, id: item.id })),
                        { type: "News" as const, id: "LIST" },
                    ]
                    : [{ type: "News" as const, id: "LIST" }],
        }),

        getNews: build.query<NewsItem, { id: NewsId; lang: Locale }>({
            query: ({id, lang}) => `/news/${id}?lang=${lang}`,
            providesTags: (result, error, {id}) => [{ type: "News", id }],
        }),

        listAdminNews: build.query<PageResponse<NewsAdminItem>, { page?: number; size?: number }>({
            query: ({page = 0, size = 50} = {}) => `/admin/news?page=${page}&size=${size}`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((item) => ({type: "News" as const, id: item.id})),
                        {type: "News" as const, id: "LIST"}
                    ]
                    : [{type: "News" as const, id: "LIST"}],
        }),

        createDraft: build.mutation<NewsAdminItem, void>({
            query: () => ({url: "/admin/news", method: "POST", body: {}}),
            invalidatesTags: [{ type: "News", id: "LIST" }],
        }),

        updateNewsPut: build.mutation<NewsAdminItem, { id: NewsId; body: UpdateNewsDto }>({
            query: ({ id, body }) => ({ url: `/admin/news/${id}`, method: "PUT", body }),
            invalidatesTags: (result, error, { id }) => [{ type: "News", id }, { type: "News", id: "LIST" }],
        }),

        updateNewsPatch: build.mutation<NewsAdminItem, { id: NewsId; body: UpdateNewsDto }>({
            query: ({ id, body }) => ({ url: `/admin/news/${id}`, method: "PATCH", body }),
            invalidatesTags: (result, error, { id }) => [{ type: "News", id }, { type: "News", id: "LIST" }],
        }),

        deleteNews: build.mutation<void, NewsId>({
            query: (id) => ({ url: `/admin/news/${id}`, method: "DELETE" }),
            invalidatesTags: (result, error, id) => [{ type: "News", id }, { type: "News", id: "LIST" }],
        }),

        publishNews: build.mutation<NewsAdminItem, NewsId>({
            query: (id) => ({url: `/admin/news/${id}/publish`, method: "POST"}),
            invalidatesTags: (result, error, id) => [{type: "News", id}, {type: "News", id: "LIST"}]
        }),

        unpublishNews: build.mutation<NewsAdminItem, NewsId>({
            query: (id) => ({url: `/admin/news/${id}/unpublish`, method: "POST"}),
            invalidatesTags: (result, error, id) => [{type: "News", id}, {type: "News", id: "LIST"}]
        }),

        archiveNews: build.mutation<NewsAdminItem, NewsId>({
            query: (id) => ({url: `/admin/news/${id}/archive`, method: "POST"}),
            invalidatesTags: (result, error, id) => [{type: "News", id}, {type: "News", id: "LIST"}]
        }),

        restoreNews: build.mutation<NewsAdminItem, NewsId>({
            query: (id) => ({url: `/admin/news/${id}/restore`, method: "POST"}),
            invalidatesTags: (result, error, id) => [{type: "News", id}, {type: "News", id: "LIST"}]
        }),

        listNewsMedia: build.query<MediaAsset[], NewsId>({
            query: (newsId) => `/admin/news/${newsId}/media`,
            providesTags: (result, error, newsId) => [
                {type: "Media", id: `NEWS-${newsId}`},
                ...(result ?? []).map((asset) => ({type: "Media" as const, id: asset.id}))
            ]
        }),

        uploadMedia: build.mutation<MediaAsset, File>({
            query: (file) => {
                const body = new FormData();
                body.append("file", file);
                return {url: "/admin/media", method: "POST", body};
            }
        }),

        attachNewsMedia: build.mutation<MediaAsset, {newsId: NewsId; mediaId: string}>({
            query: ({newsId, mediaId}) => ({
                url: `/admin/news/${newsId}/media/${mediaId}`,
                method: "PUT"
            }),
            invalidatesTags: (result, error, {newsId, mediaId}) => [
                {type: "Media", id: `NEWS-${newsId}`},
                {type: "Media", id: mediaId}
            ]
        }),

        detachNewsMedia: build.mutation<MediaAsset, {newsId: NewsId; mediaId: string}>({
            query: ({newsId, mediaId}) => ({
                url: `/admin/news/${newsId}/media/${mediaId}`,
                method: "DELETE"
            }),
            invalidatesTags: (result, error, {newsId, mediaId}) => [
                {type: "Media", id: `NEWS-${newsId}`},
                {type: "Media", id: mediaId}
            ]
        }),

        setNewsCover: build.mutation<NewsAdminItem, {newsId: NewsId; mediaId: string}>({
            query: ({newsId, mediaId}) => ({
                url: `/admin/news/${newsId}/cover/${mediaId}`,
                method: "PUT"
            }),
            invalidatesTags: (result, error, {newsId}) => [{type: "News", id: newsId}, {type: "News", id: "LIST"}]
        }),

        clearNewsCover: build.mutation<NewsAdminItem, NewsId>({
            query: (newsId) => ({url: `/admin/news/${newsId}/cover`, method: "DELETE"}),
            invalidatesTags: (result, error, newsId) => [{type: "News", id: newsId}, {type: "News", id: "LIST"}]
        }),

        setNewsCoverDisplayMode: build.mutation<NewsAdminItem, {newsId: NewsId; displayMode: CoverDisplayMode}>({
            query: ({newsId, displayMode}) => ({
                url: `/admin/news/${newsId}/cover/display-mode/${displayMode}`,
                method: "PUT"
            }),
            invalidatesTags: (result, error, {newsId}) => [{type: "News", id: newsId}, {type: "News", id: "LIST"}]
        }),

        deleteMedia: build.mutation<void, string>({
            query: (mediaId) => ({url: `/admin/media/${mediaId}`, method: "DELETE"})
        })
    }),
});

export const {
    useListNewsQuery,
    useGetNewsQuery,
    useListAdminNewsQuery,
    useCreateDraftMutation,
    useUpdateNewsPutMutation,
    useUpdateNewsPatchMutation,
    useDeleteNewsMutation,
    usePublishNewsMutation,
    useUnpublishNewsMutation,
    useArchiveNewsMutation,
    useRestoreNewsMutation,
    useListNewsMediaQuery,
    useUploadMediaMutation,
    useAttachNewsMediaMutation,
    useDetachNewsMediaMutation,
    useSetNewsCoverMutation,
    useClearNewsCoverMutation,
    useSetNewsCoverDisplayModeMutation,
    useDeleteMediaMutation
} = newsApi;
