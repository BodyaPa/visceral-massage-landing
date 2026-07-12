import type {PageResponse} from "@/types/news";

export type LoyaltyEntryType = "EARN" | "SPEND" | "REVERSAL" | "MANUAL_ADJUSTMENT";
export type LoyaltyVoucherStatus = "AVAILABLE" | "ACTIVE" | "USED" | "CANCELLED";

export interface LoyaltyReward {
    id: number;
    titleUa: string;
    titleEn: string | null;
    descriptionUa: string | null;
    descriptionEn: string | null;
    pointCost: number;
    validityDays: number;
    transferable: boolean;
    active: boolean;
    eligibleServiceIds: number[];
    eligibleEventIds: number[];
    createdAt: string;
    updatedAt: string;
}

export interface LoyaltyLedgerEntry {
    id: number;
    type: LoyaltyEntryType;
    amount: number;
    reason: string;
    bookingId: number | null;
    eventEnrollmentId: number | null;
    voucherId: number | null;
    createdAt: string;
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
    eligibleEventIds: number[];
    expiresAt: string;
    activatedAt: string | null;
    usedAt: string | null;
    createdAt: string;
}

export type LoyaltyLedgerPage = PageResponse<LoyaltyLedgerEntry>;
export type LoyaltyVoucherPage = PageResponse<LoyaltyVoucher>;
