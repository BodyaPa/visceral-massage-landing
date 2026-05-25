import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/shared/api/baseQuery";
import type { Locale } from "@/i18n";
import type { NewsAdminItem, NewsItem, NewsId, PageResponse } from "@/types/news";

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
    tagTypes: ["News"],
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

        createNews: build.mutation<NewsAdminItem, CreateNewsDto>({
            query: (body) => ({ url: `/admin/news`, method: "POST", body }),
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
    }),
});

export const {
    useListNewsQuery,
    useGetNewsQuery,
    useCreateNewsMutation,
    useUpdateNewsPutMutation,
    useUpdateNewsPatchMutation,
    useDeleteNewsMutation,
} = newsApi;
