import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/shared/api/baseQuery";
import type { Article, ArticleId, PageResponse } from "@/types/article";

export interface CreateArticleDto { title: string; content: string; }
export interface UpdateArticleDto { title?: string; content?: string; }

export const articlesApi = createApi({
    reducerPath: "articlesApi",
    baseQuery,
    tagTypes: ["Articles", "Article"],
    endpoints: (build) => ({
        listArticles: build.query<PageResponse<Article>, { page?: number; size?: number }>({
            query: ({ page = 0, size = 10 } = {}) => `/articles?page=${page}&size=${size}`,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((a) => ({ type: "Article" as const, id: a.id })),
                        { type: "Articles" as const, id: "LIST" },
                    ]
                    : [{ type: "Articles" as const, id: "LIST" }],
        }),

        getArticle: build.query<Article, ArticleId>({
            query: (id) => `/articles/${id}`,
            providesTags: (r, e, id) => [{ type: "Article", id }],
        }),

        createArticle: build.mutation<Article, CreateArticleDto>({
            query: (body) => ({ url: `/articles`, method: "POST", body }),
            invalidatesTags: [{ type: "Articles", id: "LIST" }],
        }),

        updateArticlePut: build.mutation<Article, { id: ArticleId; body: Required<UpdateArticleDto> }>({
            query: ({ id, body }) => ({ url: `/articles/${id}`, method: "PUT", body }),
            invalidatesTags: (r, e, { id }) => [{ type: "Article", id }, { type: "Articles", id: "LIST" }],
        }),

        updateArticlePatch: build.mutation<Article, { id: ArticleId; body: UpdateArticleDto }>({
            query: ({ id, body }) => ({ url: `/articles/${id}`, method: "PATCH", body }),
            invalidatesTags: (r, e, { id }) => [{ type: "Article", id }, { type: "Articles", id: "LIST" }],
        }),

        deleteArticle: build.mutation<void, ArticleId>({
            query: (id) => ({ url: `/articles/${id}`, method: "DELETE" }),
            invalidatesTags: (r, e, id) => [{ type: "Article", id }, { type: "Articles", id: "LIST" }],
        }),
    }),
});

export const {
    useListArticlesQuery,
    useGetArticleQuery,
    useCreateArticleMutation,
    useUpdateArticlePutMutation,
    useUpdateArticlePatchMutation,
    useDeleteArticleMutation,
} = articlesApi;
