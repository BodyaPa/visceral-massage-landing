import {API_URL} from "@/shared/constants/env";
import type {SiteSettings} from "@/types/siteSettings";

export async function getPublicSiteSettings() {
    try {
        const response = await fetch(`${API_URL}/api/site-settings`, {
            next: {revalidate: 60}
        });

        if (!response.ok) return null;

        return await response.json() as SiteSettings;
    } catch {
        return null;
    }
}

export function localizedSetting(settings: SiteSettings | null, locale: "ua" | "en", field: "aboutBody" | "contactBody" | "homeIntro") {
    if (!settings) return null;

    const value = locale === "ua"
        ? settings[`${field}Ua`]
        : settings[`${field}En`];

    return value?.trim() || null;
}
