import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {SiteSettings, SiteSettingsInput} from "@/types/siteSettings";

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
        })
    })
});

export const {
    useGetAdminSiteSettingsQuery,
    useGetSiteSettingsQuery,
    useUpdateSiteSettingsMutation
} = siteSettingsApi;
