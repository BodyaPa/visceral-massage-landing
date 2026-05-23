import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/shared/api/baseQuery";
import type { NewsItem, NewsId, PageResponse } from "@/types/news";

export interface CreateNewsDto { title: string; content: string; }
export interface UpdateNewsDto { title?: string; content?: string; }

export const newsApi = createApi({
    reducerPath: "newsApi",
    baseQuery,
    tagTypes: ["News"],
    endpoints: (build) => ({
        listNews: build.query<PageResponse<NewsItem>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 10 } = {}) => `/news?page=${page}&size=${size}`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((item) => ({ type: "News" as const, id: item.id })),
                        { type: "News" as const, id: "LIST" },
                    ]
                    : [{ type: "News" as const, id: "LIST" }],
        }),

        getNews: build.query<NewsItem, NewsId>({
            query: (id) => `/news/${id}`,
            providesTags: (result, error, id) => [{ type: "News", id }],
        }),

        createNews: build.mutation<NewsItem, CreateNewsDto>({
            query: (body) => ({ url: `/news`, method: "POST", body }),
            invalidatesTags: [{ type: "News", id: "LIST" }],
        }),

        updateNewsPut: build.mutation<NewsItem, { id: NewsId; body: Required<UpdateNewsDto> }>({
            query: ({ id, body }) => ({ url: `/news/${id}`, method: "PUT", body }),
            invalidatesTags: (result, error, { id }) => [{ type: "News", id }, { type: "News", id: "LIST" }],
        }),

        updateNewsPatch: build.mutation<NewsItem, { id: NewsId; body: UpdateNewsDto }>({
            query: ({ id, body }) => ({ url: `/news/${id}`, method: "PATCH", body }),
            invalidatesTags: (result, error, { id }) => [{ type: "News", id }, { type: "News", id: "LIST" }],
        }),

        deleteNews: build.mutation<void, NewsId>({
            query: (id) => ({ url: `/news/${id}`, method: "DELETE" }),
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
