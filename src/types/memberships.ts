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
    visitsTotal: number | null;
    validityDays: number;
    active: boolean;
}

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
