import type {PageResponse} from "@/types/news";

export type ServiceBookingMode = "INDIVIDUAL_APPOINTMENT" | "FIXED_EVENT";

export interface AdminService {
    id: number;
    titleUa: string;
    descriptionUa: string | null;
    titleEn: string | null;
    descriptionEn: string | null;
    durationMinutes: number;
    basePrice: number;
    bookingMode: ServiceBookingMode;
    active: boolean;
    externalPaymentUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PublicService {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    basePrice: number;
    bookingMode: ServiceBookingMode;
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
    bookingMode: ServiceBookingMode;
    active: boolean;
    externalPaymentUrl?: string | null;
};
