import type {PageResponse} from "@/types/news";

export type ServiceBookingMode = "INDIVIDUAL_APPOINTMENT" | "FIXED_EVENT";
export type ServiceBusinessDirection = "MASSAGE" | "TRAINING";
export type RequiredResourceType = "MASSAGE_ROOM" | "TRAINING_HALL";

export interface AdminService {
    id: number;
    titleUa: string;
    descriptionUa: string | null;
    titleEn: string | null;
    descriptionEn: string | null;
    durationMinutes: number;
    basePrice: number;
    businessDirection: ServiceBusinessDirection;
    requiredResourceType: RequiredResourceType;
    bookingMode: ServiceBookingMode;
    active: boolean;
    externalPaymentUrl: string | null;
    loyaltyPointsAward: number;
    createdAt: string;
    updatedAt: string;
}

export interface PublicService {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    basePrice: number;
    businessDirection: ServiceBusinessDirection;
    requiredResourceType: RequiredResourceType;
    bookingMode: ServiceBookingMode;
    loyaltyPointsAward?: number;
}

export type AdminServicePageResponse = PageResponse<AdminService>;
export type PublicServicePageResponse = PageResponse<PublicService>;

export type ServiceInput = {
    titleUa: string;
    descriptionUa?: string | null;
    titleEn?: string | null;
    descriptionEn?: string | null;
    durationMinutes: number;
    basePrice: number;
    businessDirection: ServiceBusinessDirection;
    requiredResourceType: RequiredResourceType;
    bookingMode: ServiceBookingMode;
    active: boolean;
    externalPaymentUrl?: string | null;
    loyaltyPointsAward: number;
};
