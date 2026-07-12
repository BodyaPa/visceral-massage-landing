import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {LoyaltyLedgerPage, LoyaltyReward, LoyaltyVoucher, LoyaltyVoucherPage} from "@/types/loyalty";

export const loyaltyApi = createApi({
    reducerPath: "loyaltyApi",
    baseQuery,
    tagTypes: ["LoyaltyBalance", "LoyaltyLedger", "LoyaltyVouchers", "LoyaltyRewards"],
    endpoints: (build) => ({
        getLoyaltyBalance: build.query<{balance: number}, void>({
            query: () => "/loyalty/balance",
            providesTags: ["LoyaltyBalance"]
        }),
        getLoyaltyLedger: build.query<LoyaltyLedgerPage, {page: number; size?: number}>({
            query: ({page, size = 12}) => `/loyalty/ledger?page=${page}&size=${size}&sort=createdAt,desc`,
            providesTags: ["LoyaltyLedger"]
        }),
        getLoyaltyRewards: build.query<LoyaltyReward[], void>({
            query: () => "/loyalty/rewards",
            providesTags: ["LoyaltyRewards"]
        }),
        getLoyaltyVouchers: build.query<LoyaltyVoucherPage, {page: number; size?: number}>({
            query: ({page, size = 12}) => `/loyalty/vouchers?page=${page}&size=${size}&sort=createdAt,desc`,
            providesTags: ["LoyaltyVouchers"]
        }),
        redeemLoyaltyReward: build.mutation<LoyaltyVoucher, number>({
            query: (id) => ({url: `/loyalty/rewards/${id}/redeem`, method: "POST"}),
            invalidatesTags: ["LoyaltyBalance", "LoyaltyLedger", "LoyaltyVouchers"]
        }),
        activateLoyaltyVoucher: build.mutation<LoyaltyVoucher, string>({
            query: (code) => ({url: "/loyalty/vouchers/activate", method: "POST", body: {code}}),
            invalidatesTags: ["LoyaltyVouchers"]
        }),
        getAdminLoyaltyRewards: build.query<LoyaltyReward[], void>({
            query: () => "/admin/loyalty/rewards",
            providesTags: ["LoyaltyRewards"]
        }),
        createAdminLoyaltyReward: build.mutation<LoyaltyReward, Omit<LoyaltyReward, "id" | "createdAt" | "updatedAt">>({
            query: (body) => ({url: "/admin/loyalty/rewards", method: "POST", body}),
            invalidatesTags: ["LoyaltyRewards"]
        }),
        updateAdminLoyaltyReward: build.mutation<LoyaltyReward, {id: number; body: Omit<LoyaltyReward, "id" | "createdAt" | "updatedAt">}>({
            query: ({id, body}) => ({url: `/admin/loyalty/rewards/${id}`, method: "PUT", body}),
            invalidatesTags: ["LoyaltyRewards"]
        }),
        createLoyaltyAdjustment: build.mutation<void, {userId: number; amount: number; reason: string}>({
            query: (body) => ({url: "/admin/loyalty/adjustments", method: "POST", body})
        })
    })
});

export const {
    useGetLoyaltyBalanceQuery,
    useGetLoyaltyLedgerQuery,
    useGetLoyaltyRewardsQuery,
    useGetLoyaltyVouchersQuery,
    useRedeemLoyaltyRewardMutation,
    useActivateLoyaltyVoucherMutation,
    useGetAdminLoyaltyRewardsQuery,
    useCreateAdminLoyaltyRewardMutation,
    useUpdateAdminLoyaltyRewardMutation,
    useCreateLoyaltyAdjustmentMutation
} = loyaltyApi;
