import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {LoyaltyEarningRule, LoyaltyLedgerPage, LoyaltyProgram, LoyaltyReward, LoyaltyVoucher, LoyaltyVoucherPage} from "@/types/loyalty";

export const loyaltyApi = createApi({
    reducerPath: "loyaltyApi",
    baseQuery,
    tagTypes: ["LoyaltyBalance", "LoyaltyLedger", "LoyaltyVouchers", "LoyaltyRewards", "LoyaltyPrograms", "LoyaltyRules"],
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
        createLoyaltyAdjustment: build.mutation<void, {userId: number; amount: number; reason: string; expiresAt: string | null}>({
            query: (body) => ({url: "/admin/loyalty/adjustments", method: "POST", body})
        }),
        getLoyaltyPrograms: build.query<LoyaltyProgram[], void>({
            query: () => "/admin/loyalty/programs", providesTags: ["LoyaltyPrograms"]
        }),
        createLoyaltyProgram: build.mutation<LoyaltyProgram, {name: string; active: boolean}>({
            query: (body) => ({url: "/admin/loyalty/programs", method: "POST", body}),
            invalidatesTags: ["LoyaltyPrograms"]
        }),
        getLoyaltyRules: build.query<LoyaltyEarningRule[], void>({
            query: () => "/admin/loyalty/earning-rules", providesTags: ["LoyaltyRules"]
        }),
        createLoyaltyRule: build.mutation<LoyaltyEarningRule, Omit<LoyaltyEarningRule, "id" | "createdAt">>({
            query: (body) => ({url: "/admin/loyalty/earning-rules", method: "POST", body}),
            invalidatesTags: ["LoyaltyRules"]
        }),
        reverseLoyaltyEntry: build.mutation<void, {id: number; reason: string}>({
            query: ({id, reason}) => ({url: `/admin/loyalty/ledger/${id}/reverse`, method: "POST", body: {reason}})
        }),
        invalidateLoyaltyVoucher: build.mutation<LoyaltyVoucher, {id: number; reason: string; restoreSpentPoints: boolean}>({
            query: ({id, ...body}) => ({url: `/admin/loyalty/vouchers/${id}/invalidate`, method: "POST", body}),
            invalidatesTags: ["LoyaltyBalance", "LoyaltyLedger", "LoyaltyVouchers"]
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
    useCreateLoyaltyAdjustmentMutation,
    useGetLoyaltyProgramsQuery,
    useCreateLoyaltyProgramMutation,
    useGetLoyaltyRulesQuery,
    useCreateLoyaltyRuleMutation,
    useReverseLoyaltyEntryMutation,
    useInvalidateLoyaltyVoucherMutation
} = loyaltyApi;
