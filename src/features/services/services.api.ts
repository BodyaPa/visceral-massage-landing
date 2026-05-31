import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {AdminService, AdminServicePageResponse, PublicServicePageResponse, ServiceInput} from "@/types/services";
import type {Locale} from "@/i18n";

type ListAdminServicesArgs = {
    query?: string;
    active?: boolean | "";
    page?: number;
    size?: number;
};

function listAdminServicesPath({query, active, page = 0, size = 100}: ListAdminServicesArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (query?.trim()) params.set("query", query.trim());
    if (active !== "" && active !== undefined) params.set("active", String(active));

    return `/admin/services?${params.toString()}`;
}

export const servicesApi = createApi({
    reducerPath: "servicesApi",
    baseQuery,
    tagTypes: ["Services"],
    endpoints: (build) => ({
        listServices: build.query<PublicServicePageResponse, {lang: Locale; page?: number; size?: number}>({
            query: ({lang, page = 0, size = 50}) => `/services?lang=${lang}&page=${page}&size=${size}`
        }),
        listAdminServices: build.query<AdminServicePageResponse, ListAdminServicesArgs>({
            query: listAdminServicesPath,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((service) => ({type: "Services" as const, id: service.id})),
                        {type: "Services" as const, id: "LIST"}
                    ]
                    : [{type: "Services" as const, id: "LIST"}]
        }),
        createService: build.mutation<AdminService, ServiceInput>({
            query: (body) => ({url: "/admin/services", method: "POST", body}),
            invalidatesTags: [{type: "Services", id: "LIST"}]
        }),
        updateService: build.mutation<AdminService, {id: number; body: ServiceInput}>({
            query: ({id, body}) => ({url: `/admin/services/${id}`, method: "PUT", body}),
            invalidatesTags: (result, error, {id}) => [
                {type: "Services", id},
                {type: "Services", id: "LIST"}
            ]
        })
    })
});

export const {
    useListServicesQuery,
    useListAdminServicesQuery,
    useCreateServiceMutation,
    useUpdateServiceMutation
} = servicesApi;
