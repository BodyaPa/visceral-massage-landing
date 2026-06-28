import {API_URL} from "@/shared/constants/env";
import type {NewsId} from "@/types/news";

const PUBLISHED_MEDIA_PATH = /^\/api\/news\/\d+\/media\/[0-9a-f-]+\/content$/i;
const PUBLIC_NEWS_MEDIA_PATH = /^\/api\/news\/\d+\/media\/([0-9a-f-]+)\/content$/i;
const PUBLIC_SITE_MEDIA_PATH = /^\/api\/site-settings\/media\/([0-9a-f-]+)\/content$/i;

export function createPublishedMediaPath(newsId: NewsId, mediaId: string) {
    return `/api/news/${newsId}/media/${mediaId}/content`;
}

export function resolvePublishedMediaUrl(url: string) {
    return PUBLISHED_MEDIA_PATH.test(url) ? `${API_URL}${url}` : url;
}

export function resolveAdminMediaUrl(url: string) {
    const newsMatch = url.match(PUBLIC_NEWS_MEDIA_PATH);
    if (newsMatch) return `${API_URL}/api/admin/media/${newsMatch[1]}/content`;
    const siteMatch = url.match(PUBLIC_SITE_MEDIA_PATH);
    return siteMatch ? `${API_URL}/api/admin/site-settings/media/${siteMatch[1]}/content` : url;
}

export function createAdminMediaUrl(mediaId: string) {
    return `${API_URL}/api/admin/media/${mediaId}/content`;
}
