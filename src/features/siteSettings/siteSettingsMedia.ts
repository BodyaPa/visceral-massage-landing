import {API_URL} from "@/shared/constants/env";

export function createSiteMediaPath(mediaId: string) {
    return `/api/site-settings/media/${mediaId}/content`;
}

export function createAdminSiteMediaUrl(mediaId: string) {
    return `${API_URL}/api/admin/site-settings/media/${mediaId}/content`;
}

export function resolvePublicSiteMediaUrl(path: string) {
    return path.startsWith("/api/site-settings/") ? `${API_URL}${path}` : path;
}
