export type ClientSummary = {
    id: number;
    displayName: string;
    phone: string | null;
    email: string | null;
    enabled: boolean;
    individualBookingCount: number;
    trainingParticipationCount: number;
    bookedValue: number;
    firstVisitAt: string | null;
    lastVisitAt: string | null;
    loyaltyBalance: number;
    registeredAt: string;
};

export type ClientProfile = {
    summary: ClientSummary;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
};

export type ClientMembership = {id: number; titleUa: string; titleEn: string; status: string; price: number; visitsTotal: number | null; visitsRemaining: number | null; activatedAt: string | null; expiresAt: string | null; createdAt: string};
export type ClientVoucher = {id: number; titleUa: string; titleEn: string | null; code: string | null; status: string; transferable: boolean; owned: boolean; expiresAt: string | null; activatedAt: string | null; usedAt: string | null; createdAt: string};
export type ClientReview = {id: number; rating: number; text: string | null; status: string; offeringTitleUa: string; offeringTitleEn: string | null; direction: "MASSAGE" | "TRAINING"; companyResponse: string | null; createdAt: string; updatedAt: string};
export type ClientNote = {id: number; authorUserId: number; authorName: string; text: string; createdAt: string};
export type ClientPromoUsage = {id: number; code: string; bookingId: number | null; trainingParticipantId: number | null; discountPercent: number; originalPrice: number; discountAmount: number; finalPrice: number; usedAt: string};
