import type {PageResponse} from "@/types/news";

export type ServiceBusinessDirection = "MASSAGE" | "TRAINING";

export interface AdminService {
    id: number;
    titleUa: string;
    descriptionUa: string | null;
    titleEn: string | null;
    descriptionEn: string | null;
    durationMinutes: number;
    basePrice: number;
    businessDirection: ServiceBusinessDirection;
    active: boolean;
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
    active: boolean;
};

export type ServiceVariant = {id:number;serviceId:number;nameUa:string;nameEn:string|null;durationMinutes:number;price:number;bufferBeforeMinutes:number;bufferAfterMinutes:number;prepaymentEnabled:boolean;depositAmount:number;active:boolean;specialistIds:number[];resourceIds:number[]};
export type ServiceVariantInput = Omit<ServiceVariant,"id"|"serviceId">;
