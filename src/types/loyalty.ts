import type {PageResponse} from "@/types/news";

export type LoyaltyEntryType = "EARN" | "SPEND" | "REVERSAL" | "RESTORATION" | "MANUAL_ADJUSTMENT";
export type LoyaltyVoucherStatus = "AVAILABLE" | "ACTIVE" | "RESERVED" | "USED" | "EXPIRED" | "INVALIDATED" | "CANCELLED";
export type LoyaltyEffectType = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_PROCEDURE";

export interface LoyaltyReward {
    id: number;
    titleUa: string;
    titleEn: string | null;
    descriptionUa: string | null;
    descriptionEn: string | null;
    pointCost: number;
    validityDays: number | null;
    transferable: boolean;
    active: boolean;
    eligibleServiceIds: number[];
    eligibleServiceVariantIds: number[];
    eligibleTrainingTypeIds: number[];
    createdAt: string;
    updatedAt: string;
    effectType: LoyaltyEffectType;
    effectValue: number | null;
    promoCompatible: boolean;
    maxUses: number;
}

export interface LoyaltyProgram {
    id: number; name: string; active: boolean; createdAt: string; updatedAt: string;
}

export interface LoyaltyEarningRule {
    id: number; programId: number; businessDirection: "MASSAGE" | "TRAINING" | null;
    categoryKey: string | null; serviceVariantId: number | null; trainingTypeId: number | null;
    points: number; startsAt: string | null; endsAt: string | null; active: boolean; createdAt: string;
}

export interface LoyaltyLedgerEntry {
    id: number;
    type: LoyaltyEntryType;
    amount: number;
    reason: string;
    bookingId: number | null;
    trainingParticipantId: number | null;
    voucherId: number | null;
    createdAt: string;
    expiresAt: string | null;
    expiredAt: string | null;
}

export interface LoyaltyVoucher {
    id: number;
    rewardId: number;
    titleUa: string;
    titleEn: string | null;
    status: LoyaltyVoucherStatus;
    transferable: boolean;
    code: string | null;
    createdByCurrentUser: boolean;
    ownedByCurrentUser: boolean;
    eligibleServiceIds: number[];
    eligibleServiceVariantIds: number[];
    eligibleTrainingTypeIds: number[];
    expiresAt: string | null;
    activatedAt: string | null;
    usedAt: string | null;
    createdAt: string;
    effectType: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_PROCEDURE";
    effectValue: number | null;
    maxUses: number;
    usesConsumed: number;
}

export type LoyaltyLedgerPage = PageResponse<LoyaltyLedgerEntry>;
export type LoyaltyVoucherPage = PageResponse<LoyaltyVoucher>;
