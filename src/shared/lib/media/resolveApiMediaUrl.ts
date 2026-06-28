import {API_URL} from "@/shared/constants/env";

export function resolveApiMediaUrl(path: string) {
    return path.startsWith("/api/") ? `${API_URL}${path}` : path;
}
