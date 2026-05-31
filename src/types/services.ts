import type {PageResponse} from "@/types/news";

export interface AdminService {
    id: number;
    titleUa: string;
    descriptionUa: string | null;
    titleEn: string | null;
    descriptionEn: string | null;
    durationMinutes: number;
    basePrice: number;
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
    active: boolean;
    externalPaymentUrl?: string | null;
};
