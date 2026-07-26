import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    DayPlanCopyInput,
    DayPlanCopyResponse,
    FittingServiceOption,
    PublicScheduleAvailabilityBlock,
    PublicScheduleUnavailableBlock,
    ScheduleConfig,
    SpecialistAvailabilityBlock,
    SpecialistAvailabilityInput
} from "@/types/schedule";
import type {OfficeResource} from "@/types/offices";
import type {BookingStatus} from "@/types/bookings";
import type {Locale} from "@/i18n";

type ListAvailabilityArgs = {
    from: string;
    to: string;
    specialistId?: number | "";
    officeId?: number | "";
    serviceId?: number | "";
    status?: "AVAILABLE" | "BLOCKED" | BookingStatus | "ACTIVE_EVENT" | "INACTIVE_EVENT" | "PAST" | "";
};

type ListPublicAvailabilityArgs = ListAvailabilityArgs & {
    officeId?: number | "";
    serviceId?: number | "";
    specialistId?: number | "";
};

type ListFittingOptionsArgs = {
    startsAt: string;
    endsAt: string;
    officeId: number;
    serviceId?: number;
    specialistId?: number;
    resourceId?: number;
    lang: Locale;
};

export const scheduleApi = createApi({
    reducerPath: "scheduleApi",
    baseQuery,
    tagTypes: ["ScheduleAvailability"],
    endpoints: (build) => ({
        listScheduleOfficeResources: build.query<OfficeResource[], number>({
            query: (officeId) => `/admin/schedule/offices/${officeId}/resources`
        }),
        getScheduleConfig: build.query<ScheduleConfig, void>({
            query: () => "/schedule/config"
        }),
        listFittingOptions: build.query<FittingServiceOption[], ListFittingOptionsArgs>({
            query: ({startsAt, endsAt, officeId, serviceId, specialistId, resourceId, lang}) => {
                const params = new URLSearchParams({startsAt, endsAt, officeId: String(officeId), lang});
                if (serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (specialistId !== undefined) params.set("specialistId", String(specialistId));
                if (resourceId !== undefined) params.set("resourceId", String(resourceId));
                return `/schedule/fitting-options?${params.toString()}`;
            }
        }),
        listPublicAvailability: build.query<PublicScheduleAvailabilityBlock[], ListPublicAvailabilityArgs>({
            query: ({from, to, officeId, serviceId, specialistId}) => {
                const params = new URLSearchParams({from, to});
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                return `/schedule/availability?${params.toString()}`;
            }
        }),
        listPublicUnavailable: build.query<PublicScheduleUnavailableBlock[], Omit<ListPublicAvailabilityArgs, "serviceId">>({
            query: ({from, to, officeId, specialistId}) => {
                const params = new URLSearchParams({from, to});
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                return `/schedule/unavailable?${params.toString()}`;
            }
        }),
        listAvailability: build.query<SpecialistAvailabilityBlock[], ListAvailabilityArgs>({
            query: ({from, to, specialistId, officeId, serviceId, status}) => {
                const params = new URLSearchParams({from, to});
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (status === "AVAILABLE" || status === "BLOCKED") params.set("status", status);
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
	        copyDayPlan: build.mutation<DayPlanCopyResponse, DayPlanCopyInput>({
	            query: (body) => ({url: "/admin/schedule/day-copy", method: "POST", body}),
	            invalidatesTags: [
	                {type: "ScheduleAvailability", id: "LIST"},
	                {type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"},
	                {type: "ScheduleAvailability", id: "EVENTS"}
	            ]
	        }),
        previewDayPlan: build.mutation<DayPlanCopyResponse, DayPlanCopyInput>({
            query: (body) => ({url: "/admin/schedule/day-copy/preview", method: "POST", body})
        }),
	        createAvailability: build.mutation<SpecialistAvailabilityBlock, SpecialistAvailabilityInput>({
            query: (body) => ({url: "/admin/schedule/availability", method: "POST", body}),
            invalidatesTags: [{type: "ScheduleAvailability", id: "LIST"}]
        }),
        updateAvailability: build.mutation<SpecialistAvailabilityBlock, {id: number; body: SpecialistAvailabilityInput}>({
            query: ({id, body}) => ({url: `/admin/schedule/availability/${id}`, method: "PUT", body}),
            invalidatesTags: (result, error, {id}) => [
                {type: "ScheduleAvailability", id},
                {type: "ScheduleAvailability", id: "LIST"}
            ]
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
    useListScheduleOfficeResourcesQuery,
    useCreateAvailabilityMutation,
    useCopyDayPlanMutation,
    usePreviewDayPlanMutation,
    useGetScheduleConfigQuery,
    useListFittingOptionsQuery,
    useDeleteAvailabilityMutation,
    useListPublicAvailabilityQuery,
    useListPublicUnavailableQuery,
    useListAvailabilityQuery,
    useUpdateAvailabilityMutation,
} = scheduleApi;
