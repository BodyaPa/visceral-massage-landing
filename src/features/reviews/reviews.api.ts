import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {Review, ReviewDirection, ReviewEligibility, ReviewPage, ReviewReportPage, ReviewReportReason, ReviewReportStatus, ReviewStatus, ReviewSummary} from "@/types/reviews";

export const reviewsApi = createApi({
    reducerPath: "reviewsApi",
    baseQuery,
    tagTypes: ["Reviews"],
    endpoints: (build) => ({
        listPublicReviews: build.query<ReviewPage, {page: number; size?: number; lang: string; direction?: ReviewDirection; rating?: number}>({
            query: ({page, size = 9, lang, direction, rating}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort: "createdAt,desc", lang});
                if (direction) params.set("direction", direction);
                if (rating) params.set("rating", String(rating));
                return `/reviews?${params.toString()}`;
            }
        }),
        getReviewSummary: build.query<ReviewSummary, void>({query: () => "/reviews/summary"}),
        getReviewEligibility: build.query<ReviewEligibility, void>({
            query: () => "/reviews/eligibility",
            providesTags: ["Reviews"]
        }),
        createReview: build.mutation<Review, {targetType: "BOOKING" | "TRAINING_PARTICIPANT"; targetId: number; rating: number; text: string | null; lang: string}>({
            query: ({lang, ...body}) => ({url: `/reviews?lang=${lang}`, method: "POST", body}),
            invalidatesTags: ["Reviews"]
        }),
        listAdminReviews: build.query<ReviewPage, {page: number; status?: ReviewStatus; lang: string}>({
            query: ({page, status, lang}) => {
                const params = new URLSearchParams({page: String(page), size: "12", sort: "createdAt,desc", lang});
                if (status) params.set("status", status);
                return `/admin/reviews?${params.toString()}`;
            },
            providesTags: ["Reviews"]
        }),
        moderateReview: build.mutation<Review, {id: number; status: ReviewStatus; companyResponse: string | null; lang: string}>({
            query: ({id, lang, ...body}) => ({url: `/admin/reviews/${id}/moderation?lang=${lang}`, method: "PUT", body}),
            invalidatesTags: ["Reviews"]
        }),
        reportReview: build.mutation<void, {id: number; reason: ReviewReportReason; details: string | null}>({
            query: ({id, ...body}) => ({url: `/reviews/${id}/reports`, method: "POST", body})
        }),
        listReviewReports: build.query<ReviewReportPage, {page: number; status?: ReviewReportStatus}>({
            query: ({page, status = "OPEN"}) => `/admin/reviews/reports?page=${page}&size=12&status=${status}`,
            providesTags: ["Reviews"]
        }),
        resolveReviewReport: build.mutation<void, {id: number; status: Exclude<ReviewReportStatus, "OPEN">; note: string | null}>({
            query: ({id, ...body}) => ({url: `/admin/reviews/reports/${id}`, method: "PUT", body}),
            invalidatesTags: ["Reviews"]
        })
    })
});

export const {useListPublicReviewsQuery, useGetReviewSummaryQuery, useGetReviewEligibilityQuery, useCreateReviewMutation, useListAdminReviewsQuery, useModerateReviewMutation, useReportReviewMutation, useListReviewReportsQuery, useResolveReviewReportMutation} = reviewsApi;
