import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {SiteSettings, SiteSettingsInput} from "@/types/siteSettings";
import type {MediaAsset} from "@/types/news";

export const siteSettingsApi = createApi({
    reducerPath: "siteSettingsApi",
    baseQuery,
    tagTypes: ["SiteSettings"],
    endpoints: (build) => ({
        getSiteSettings: build.query<SiteSettings, void>({
            query: () => "/site-settings",
            providesTags: [{type: "SiteSettings", id: "CURRENT"}]
        }),
        getAdminSiteSettings: build.query<SiteSettings, void>({
            query: () => "/admin/site-settings",
            providesTags: [{type: "SiteSettings", id: "CURRENT"}]
        }),
        updateSiteSettings: build.mutation<SiteSettings, SiteSettingsInput>({
            query: (body) => ({url: "/admin/site-settings", method: "PUT", body}),
            invalidatesTags: [{type: "SiteSettings", id: "CURRENT"}]
        }),
        uploadSiteSettingsContentMedia: build.mutation<MediaAsset, File>({
            query: (file) => {
                const body = new FormData();
                body.append("file", file);
                return {url: "/admin/site-settings/content-media", method: "POST", body};
            }
        })
    })
});

export const {
    useGetAdminSiteSettingsQuery,
    useGetSiteSettingsQuery,
    useUploadSiteSettingsContentMediaMutation,
    useUpdateSiteSettingsMutation
} = siteSettingsApi;
