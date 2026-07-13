export type MembershipOfferKind = "MEMBERSHIP" | "CERTIFICATE";
export type MembershipPurchaseStatus = "AWAITING_PAYMENT_CONFIRMATION" | "ACTIVE" | "CANCELLED";

export interface MembershipOffer {
    id: number;
    code: "care-4" | "recovery-8" | "gift" | string;
    kind: MembershipOfferKind;
    titleUa: string;
    titleEn: string;
    descriptionUa: string | null;
    descriptionEn: string | null;
    price: number;
    externalPaymentUrl: string | null;
    visitsTotal: number | null;
    validityDays: number;
    active: boolean;
    eligibleServiceIds: number[];
    backgroundMediaId: string | null;
    backgroundMediaUrl: string | null;
}

export type MembershipOfferUpdateInput = {
    titleUa: string;
    titleEn: string | null;
    descriptionUa: string | null;
    descriptionEn: string | null;
    price: number;
    externalPaymentUrl: string | null;
    visitsTotal: number | null;
    validityDays: number;
    active: boolean;
    eligibleServiceIds: number[];
    backgroundMediaId: string | null;
};

export type MembershipOfferCreateInput = {
    kind: MembershipOfferKind;
    offer: MembershipOfferUpdateInput;
};

export interface MembershipPurchase {
    id: number;
    status: MembershipPurchaseStatus;
    userId: number;
    offerId: number;
    offerCode: string;
    offerKind: MembershipOfferKind;
    titleUa: string;
    titleEn: string;
    priceSnapshot: number;
    visitsTotal: number | null;
    visitsRemaining: number | null;
    activatedAt: string | null;
    expiresAt: string | null;
    confirmedByUserId: number | null;
    createdAt: string;
    updatedAt: string;
}

export type MembershipPurchaseInput = {
    offerId: number;
};

export interface MembershipPaymentSession {
    purchaseId: number;
    mode: "MANUAL_REVIEW" | string;
    checkoutUrl: string | null;
    requiresManualConfirmation: boolean;
}
