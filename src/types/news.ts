export type NewsId = number;
export type NewsStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CoverDisplayMode = "FILL" | "FIT";

export interface NewsItem {
    id: NewsId;
    title: string;
    content: string;
    coverImageUrl: string | null;
    coverImageAlt: string | null;
    coverDisplayMode?: CoverDisplayMode | null;
}

export interface NewsAdminItem {
    id: NewsId;
    titleUa: string | null;
    contentUa: string | null;
    titleEn: string | null;
    contentEn: string | null;
    status: NewsStatus;
    coverMediaId: string | null;
    coverDisplayMode: CoverDisplayMode;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
}

export interface MediaAsset {
    id: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
    newsId: NewsId | null;
    createdAt: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
