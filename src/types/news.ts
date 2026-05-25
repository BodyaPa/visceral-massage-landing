export type NewsId = number;

export interface NewsItem {
    id: NewsId;
    title: string | null;
    content: string | null;
    translationAvailable: boolean;
}

export interface NewsAdminItem {
    id: NewsId;
    titleUa: string | null;
    contentUa: string | null;
    titleEn: string | null;
    contentEn: string | null;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
