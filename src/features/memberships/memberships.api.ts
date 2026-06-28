import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {MembershipOffer, MembershipPurchase, MembershipPurchaseInput, MembershipPurchaseStatus} from "@/types/memberships";
import type {PageResponse} from "@/types/news";

export const membershipsApi = createApi({
    reducerPath: "membershipsApi",
    baseQuery,
    tagTypes: ["MembershipOffers", "MembershipPurchases"],
    endpoints: (build) => ({
        listMembershipOffers: build.query<MembershipOffer[], void>({
            query: () => "/memberships/offers",
            providesTags: [{type: "MembershipOffers", id: "LIST"}]
        }),
        listMyMembershipPurchases: build.query<PageResponse<MembershipPurchase>, {page?: number; size?: number} | void>({
            query: (args) => {
                const page = args?.page ?? 0;
                const size = args?.size ?? 20;
                return `/memberships/purchases/my?page=${page}&size=${size}&sort=createdAt,desc`;
            },
            providesTags: [{type: "MembershipPurchases", id: "MY"}]
        }),
        createMembershipPurchase: build.mutation<MembershipPurchase, MembershipPurchaseInput>({
            query: (body) => ({url: "/memberships/purchases", method: "POST", body}),
            invalidatesTags: [{type: "MembershipPurchases", id: "MY"}, {type: "MembershipPurchases", id: "FINANCE"}]
        }),
        listFinanceMembershipPurchases: build.query<PageResponse<MembershipPurchase>, {status?: MembershipPurchaseStatus | ""; page?: number; size?: number}>({
            query: ({status = "AWAITING_PAYMENT_CONFIRMATION", page = 0, size = 100}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort: "createdAt,desc"});
                if (status) params.set("status", status);
                return `/admin/finance/memberships?${params.toString()}`;
            },
            providesTags: [{type: "MembershipPurchases", id: "FINANCE"}]
        }),
        confirmMembershipPayment: build.mutation<MembershipPurchase, number>({
            query: (id) => ({url: `/admin/finance/memberships/${id}/confirm-payment`, method: "POST"}),
            invalidatesTags: [{type: "MembershipPurchases", id: "FINANCE"}, {type: "MembershipPurchases", id: "MY"}]
        })
    })
});

export const {
    useConfirmMembershipPaymentMutation,
    useCreateMembershipPurchaseMutation,
    useListFinanceMembershipPurchasesQuery,
    useListMembershipOffersQuery,
    useListMyMembershipPurchasesQuery
} = membershipsApi;
