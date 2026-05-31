import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {Office, OfficeInput, OfficePageResponse} from "@/types/offices";

type ListOfficesArgs = {
    query?: string;
    active?: boolean | "";
    page?: number;
    size?: number;
};

function listOfficesPath({query, active, page = 0, size = 100}: ListOfficesArgs) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc"
    });

    if (query?.trim()) params.set("query", query.trim());
    if (active !== "" && active !== undefined) params.set("active", String(active));

    return `/admin/offices?${params.toString()}`;
}

export const officesApi = createApi({
    reducerPath: "officesApi",
    baseQuery,
    tagTypes: ["Offices"],
    endpoints: (build) => ({
        listOffices: build.query<OfficePageResponse, ListOfficesArgs>({
            query: listOfficesPath,
            providesTags: (result) =>
                result
                    ? [
                        ...result.content.map((office) => ({type: "Offices" as const, id: office.id})),
                        {type: "Offices" as const, id: "LIST"}
                    ]
                    : [{type: "Offices" as const, id: "LIST"}]
        }),
        createOffice: build.mutation<Office, OfficeInput>({
            query: (body) => ({url: "/admin/offices", method: "POST", body}),
            invalidatesTags: [{type: "Offices", id: "LIST"}]
        }),
        updateOffice: build.mutation<Office, {id: number; body: OfficeInput}>({
            query: ({id, body}) => ({url: `/admin/offices/${id}`, method: "PUT", body}),
            invalidatesTags: (result, error, {id}) => [
                {type: "Offices", id},
                {type: "Offices", id: "LIST"}
            ]
        })
    })
});

export const {
    useListOfficesQuery,
    useCreateOfficeMutation,
    useUpdateOfficeMutation
} = officesApi;
