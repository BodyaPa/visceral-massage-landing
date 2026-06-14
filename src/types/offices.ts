import type {PageResponse} from "@/types/news";

export interface Office {
    id: number;
    name: string;
    address: string;
    active: boolean;
    locationDetails: string | null;
    directions: string | null;
    googleMapsUrl: string | null;
    photoMediaId: string | null;
    photoMediaUrl: string | null;
    videoMediaId: string | null;
    videoMediaUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export type OfficePageResponse = PageResponse<Office>;

export type OfficeInput = {
    name: string;
    address: string;
    active: boolean;
    directions?: string | null;
    googleMapsUrl?: string | null;
    photoMediaId?: string | null;
    videoMediaId?: string | null;
};
