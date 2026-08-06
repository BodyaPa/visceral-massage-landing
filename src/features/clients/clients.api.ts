import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {PageResponse} from "@/types/news";
import type {ClientMembership, ClientNote, ClientProfile, ClientPromoUsage, ClientRestrictionEvent, ClientReview, ClientSummary, ClientVoucher} from "@/types/clients";
import type {AdminBookingRecord} from "@/types/bookings";
import type {AdminTrainingRecord} from "@/types/training";

export const clientsApi = createApi({
    reducerPath: "clientsApi",
    baseQuery,
    tagTypes: ["ClientNotes", "Restrictions", "Clients"],
    endpoints: build => ({
        listClients: build.query<PageResponse<ClientSummary>, {query?: string; enabled?: boolean | ""; segment?: "NO_VISITS" | "HAS_VISITS" | "ACTIVE_MEMBERSHIP" | ""; page?: number; size?: number}>({
            query: ({query, enabled, segment, page = 0, size = 25}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort: "created_at,desc"});
                if (query?.trim()) params.set("query", query.trim());
                if (enabled !== "") params.set("enabled", String(enabled));
                if (segment) params.set("segment", segment);
                return `/admin/clients?${params.toString()}`;
            }
        }),
        getClientProfile: build.query<ClientProfile, number>({
            query: id => `/admin/clients/${id}`
        }),
        listClientBookings: build.query<PageResponse<AdminBookingRecord>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/bookings?page=${page}&size=${size}&sort=startsAt,desc`
        }),
        listClientTraining: build.query<PageResponse<AdminTrainingRecord>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/training?page=${page}&size=${size}&sort=trainingSession.startsAt,desc`
        }),
        listClientMemberships: build.query<PageResponse<ClientMembership>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/memberships?page=${page}&size=${size}&sort=createdAt,desc`
        }),
        listClientVouchers: build.query<PageResponse<ClientVoucher>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/vouchers?page=${page}&size=${size}&sort=createdAt,desc`
        }),
        listClientReviews: build.query<PageResponse<ClientReview>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/reviews?page=${page}&size=${size}&sort=createdAt,desc`
        }),
        listClientPromoUsages: build.query<PageResponse<ClientPromoUsage>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/promo-usages?page=${page}&size=${size}&sort=usedAt,desc`
        }),
        listClientNotes: build.query<PageResponse<ClientNote>, {id: number; page?: number; size?: number}>({
            query: ({id, page = 0, size = 5}) => `/admin/clients/${id}/notes?page=${page}&size=${size}&sort=createdAt,desc`,
            providesTags: ["ClientNotes"]
        }),
        addClientNote: build.mutation<ClientNote, {id: number; text: string}>({
            query: ({id, text}) => ({url: `/admin/clients/${id}/notes`, method: "POST", body: {text}}),
            invalidatesTags: ["ClientNotes"]
        }),
        listRestrictions: build.query<ClientRestrictionEvent[], number>({
            query: id => `/admin/clients/${id}/restrictions`,
            providesTags: ["Restrictions"]
        }),
        addRestriction: build.mutation<ClientRestrictionEvent, {id: number; reason: string}>({
            query: ({id, reason}) => ({url: `/admin/clients/${id}/restrictions`, method: "POST", body: {reason}}),
            invalidatesTags: ["Restrictions", "Clients"]
        }),
        removeRestriction: build.mutation<ClientRestrictionEvent, {id: number; reason: string}>({
            query: ({id, reason}) => ({url: `/admin/clients/${id}/restrictions/remove`, method: "POST", body: {reason}}),
            invalidatesTags: ["Restrictions", "Clients"]
        })
    })
});

export const {useListClientsQuery, useGetClientProfileQuery, useListClientBookingsQuery, useListClientTrainingQuery, useListClientMembershipsQuery, useListClientVouchersQuery, useListClientReviewsQuery, useListClientPromoUsagesQuery, useListClientNotesQuery, useAddClientNoteMutation, useListRestrictionsQuery, useAddRestrictionMutation, useRemoveRestrictionMutation} = clientsApi;
