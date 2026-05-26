import {API_URL} from "@/shared/constants/env";
import type {NewsId} from "@/types/news";

const PUBLISHED_MEDIA_PATH = /^\/api\/news\/\d+\/media\/[0-9a-f-]+\/content$/i;
const ADMIN_MEDIA_PATH = /^\/api\/news\/\d+\/media\/([0-9a-f-]+)\/content$/i;

export function createPublishedMediaPath(newsId: NewsId, mediaId: string) {
    return `/api/news/${newsId}/media/${mediaId}/content`;
}

export function resolvePublishedMediaUrl(url: string) {
    return PUBLISHED_MEDIA_PATH.test(url) ? `${API_URL}${url}` : url;
}

export function resolveAdminMediaUrl(url: string) {
    const match = url.match(ADMIN_MEDIA_PATH);
    return match ? `${API_URL}/api/admin/media/${match[1]}/content` : url;
}

export function createAdminMediaUrl(mediaId: string) {
    return `${API_URL}/api/admin/media/${mediaId}/content`;
}
