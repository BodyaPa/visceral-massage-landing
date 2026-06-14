import type {PageResponse} from "@/types/news";

export interface Office {
    id: number;
    name: string;
    address: string;
    active: boolean;
    phone: string | null;
    email: string | null;
    locationDetails: string | null;
    directions: string | null;
    photoUrl: string | null;
    videoUrl: string | null;
    googleMapsUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export type OfficePageResponse = PageResponse<Office>;

export type OfficeInput = {
    name: string;
    address: string;
    active: boolean;
    phone?: string | null;
    email?: string | null;
    directions?: string | null;
    photoUrl?: string | null;
    videoUrl?: string | null;
    googleMapsUrl?: string | null;
};
