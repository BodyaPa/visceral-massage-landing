import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    PublicScheduleAvailabilityBlock,
    SpecialistAvailabilityBlock,
    SpecialistAvailabilityInput
} from "@/types/schedule";

type ListAvailabilityArgs = {
    from: string;
    to: string;
};

type ListPublicAvailabilityArgs = ListAvailabilityArgs & {
    officeId?: number | "";
    specialistId?: number | "";
};

export const scheduleApi = createApi({
    reducerPath: "scheduleApi",
    baseQuery,
    tagTypes: ["ScheduleAvailability"],
    endpoints: (build) => ({
        listPublicAvailability: build.query<PublicScheduleAvailabilityBlock[], ListPublicAvailabilityArgs>({
            query: ({from, to, officeId, specialistId}) => {
                const params = new URLSearchParams({from, to});
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                return `/schedule/availability?${params.toString()}`;
            }
        }),
        listAvailability: build.query<SpecialistAvailabilityBlock[], ListAvailabilityArgs>({
            query: ({from, to}) => {
                const params = new URLSearchParams({from, to});
                return `/admin/schedule/availability?${params.toString()}`;
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((block) => ({type: "ScheduleAvailability" as const, id: block.id})),
                        {type: "ScheduleAvailability" as const, id: "LIST"}
                    ]
                    : [{type: "ScheduleAvailability" as const, id: "LIST"}]
        }),
        createAvailability: build.mutation<SpecialistAvailabilityBlock, SpecialistAvailabilityInput>({
            query: (body) => ({url: "/admin/schedule/availability", method: "POST", body}),
            invalidatesTags: [{type: "ScheduleAvailability", id: "LIST"}]
        }),
        deleteAvailability: build.mutation<void, number>({
            query: (id) => ({url: `/admin/schedule/availability/${id}`, method: "DELETE"}),
            invalidatesTags: (result, error, id) => [
                {type: "ScheduleAvailability", id},
                {type: "ScheduleAvailability", id: "LIST"}
            ]
        })
    })
});

export const {
    useCreateAvailabilityMutation,
    useDeleteAvailabilityMutation,
    useListPublicAvailabilityQuery,
    useListAvailabilityQuery
} = scheduleApi;
