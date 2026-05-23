export type NewsId = number;

export interface NewsItem {
    id: NewsId;
    title: string;
    content: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
