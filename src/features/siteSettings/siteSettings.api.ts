import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {SiteSettings, SiteSettingsInput} from "@/types/siteSettings";
import type {MediaAsset} from "@/types/news";

export const siteSettingsApi = createApi({
    reducerPath: "siteSettingsApi",
    baseQuery,
    tagTypes: ["SiteSettings", "SiteMedia"],
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
        listSiteSettingsMedia: build.query<MediaAsset[], void>({
            query: () => "/site-settings/media",
            providesTags: [{type: "SiteMedia", id: "LIST"}]
        }),
        listAdminSiteSettingsMedia: build.query<MediaAsset[], void>({
            query: () => "/admin/site-settings/media",
            providesTags: [{type: "SiteMedia", id: "LIST"}]
        }),
        uploadSiteSettingsMedia: build.mutation<MediaAsset, File>({
            query: (file) => {
                const body = new FormData();
                body.append("file", file);
                return {url: "/admin/site-settings/media", method: "POST", body};
            },
            invalidatesTags: [{type: "SiteMedia", id: "LIST"}]
        }),
        unlinkSiteSettingsMedia: build.mutation<MediaAsset, string>({
            query: (mediaId) => ({url: `/admin/site-settings/media/${mediaId}`, method: "DELETE"}),
            invalidatesTags: [{type: "SiteMedia", id: "LIST"}]
        }),
        reorderSiteSettingsMedia: build.mutation<MediaAsset[], string[]>({
            query: (mediaIds) => ({url: "/admin/site-settings/media/order", method: "PUT", body: {mediaIds}}),
            invalidatesTags: [{type: "SiteMedia", id: "LIST"}]
        })
    })
});

export const {
    useGetAdminSiteSettingsQuery,
    useGetSiteSettingsQuery,
    useListAdminSiteSettingsMediaQuery,
    useListSiteSettingsMediaQuery,
    useReorderSiteSettingsMediaMutation,
    useUnlinkSiteSettingsMediaMutation,
    useUploadSiteSettingsMediaMutation,
    useUpdateSiteSettingsMutation
} = siteSettingsApi;
