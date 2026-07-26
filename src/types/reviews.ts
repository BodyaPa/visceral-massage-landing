import type {PageResponse} from "@/types/news";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
export type ReviewDirection = "MASSAGE" | "TRAINING";

export type Review = {
    id: number;
    rating: number;
    text: string | null;
    status: ReviewStatus;
    displayName: string;
    offeringTitle: string;
    specialistName: string;
    officeName: string | null;
    direction: ReviewDirection;
    companyResponse: string | null;
    verifiedVisit: boolean;
    createdAt: string;
};

export type ReviewSummary = {
    total: number;
    averageRating: number;
    distribution: Record<string, number>;
};

export type ReviewPage = PageResponse<Review>;

export type ReviewEligibility = {
    reviewableBookingIds: number[];
    reviewedBookingIds: number[];
    reviewableTrainingParticipantIds: number[];
    reviewedTrainingParticipantIds: number[];
};

export type ReviewReportReason = "SPAM" | "ABUSE" | "PRIVACY" | "MISLEADING" | "OTHER";
export type ReviewReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type ReviewReport = {id:number;reviewId:number;reason:ReviewReportReason;details:string|null;status:ReviewReportStatus;resolutionNote:string|null;createdAt:string};
export type ReviewReportPage = PageResponse<ReviewReport>;
