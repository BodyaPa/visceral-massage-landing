export type ArticleId = number;

export interface Article {
    id: ArticleId;
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
