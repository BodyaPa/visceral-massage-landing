import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    DayPlanCopyInput,
    DayPlanCopyResponse,
    FittingServiceOption,
    PublicFixedEvent,
    PublicScheduleAvailabilityBlock,
    PublicScheduleUnavailableBlock,
    ScheduleConfig,
    SpecialistAvailabilityBlock,
    SpecialistFixedEvent,
    SpecialistFixedEventEnrollment,
    SpecialistFixedEventInput,
    SpecialistAvailabilityInput
} from "@/types/schedule";
import type {OfficeResource} from "@/types/offices";
import type {BookingStatus} from "@/types/bookings";
import type {Locale} from "@/i18n";
import type {PageResponse} from "@/types/news";

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

type ListPublicEventsArgs = ListPublicAvailabilityArgs & {
    lang: Locale;
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
        listPublicEvents: build.query<PublicFixedEvent[], ListPublicEventsArgs>({
            query: ({from, to, officeId, serviceId, specialistId, lang}) => {
                const params = new URLSearchParams({from, to, lang});
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                return `/schedule/events?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "EVENTS"}]
        }),
        listMyFixedEventEnrollments: build.query<PageResponse<PublicFixedEvent>, ListAvailabilityArgs & {lang: Locale; page?: number; size?: number}>({
            query: ({from, to, lang, page = 0, size = 20}) => {
                const params = new URLSearchParams({from, to, lang, page: String(page), size: String(size), sort: "createdAt,desc"});
                return `/schedule/events/my?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "MY_EVENTS"}]
        }),
        enrollFixedEvent: build.mutation<PublicFixedEvent, {id: number; lang: Locale; reminderOptIn: boolean; membershipPurchaseId?: number | null; loyaltyVoucherId?: number | null; promoCode?: string | null}>({
            query: ({id, lang, reminderOptIn, membershipPurchaseId, loyaltyVoucherId, promoCode}) => ({
                url: `/schedule/events/${id}/enroll?lang=${lang}`,
                method: "POST",
                body: {reminderOptIn, membershipPurchaseId, loyaltyVoucherId, promoCode}
            }),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "EVENTS"},
                {type: "ScheduleAvailability", id: "MY_EVENTS"},
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENT_ENROLLMENTS"}
            ]
        }),
        cancelFixedEventEnrollment: build.mutation<PublicFixedEvent, {id: number; lang: Locale; reason: string; details?: string | null}>({
            query: ({id, lang, reason, details}) => ({
                url: `/schedule/events/${id}/cancel?lang=${lang}`,
                method: "POST",
                body: {reason, details}
            }),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "EVENTS"},
                {type: "ScheduleAvailability", id: "MY_EVENTS"},
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENT_ENROLLMENTS"}
            ]
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
        listSpecialistEvents: build.query<SpecialistFixedEvent[], ListAvailabilityArgs>({
            query: ({from, to, specialistId, officeId, serviceId, status}) => {
                const params = new URLSearchParams({from, to});
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (status === "ACTIVE_EVENT") params.set("active", "true");
                if (status === "INACTIVE_EVENT") params.set("active", "false");
                return `/admin/schedule/events?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"}]
        }),
        listSpecialistEventEnrollments: build.query<SpecialistFixedEventEnrollment[], ListAvailabilityArgs>({
            query: ({from, to, specialistId, officeId, serviceId, status}) => {
                const params = new URLSearchParams({from, to});
                if (specialistId !== "" && specialistId !== undefined) params.set("specialistId", String(specialistId));
                if (officeId !== "" && officeId !== undefined) params.set("officeId", String(officeId));
                if (serviceId !== "" && serviceId !== undefined) params.set("serviceId", String(serviceId));
                if (status === "ACTIVE_EVENT") params.set("eventActive", "true");
                if (status === "INACTIVE_EVENT") params.set("eventActive", "false");
                return `/admin/schedule/events/enrollments?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "SPECIALIST_EVENT_ENROLLMENTS"}]
        }),
        createSpecialistEvent: build.mutation<SpecialistFixedEvent, SpecialistFixedEventInput>({
            query: (body) => ({url: "/admin/schedule/events", method: "POST", body}),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"},
                {type: "ScheduleAvailability", id: "EVENTS"}
            ]
        }),
	        updateSpecialistEvent: build.mutation<SpecialistFixedEvent, {id: number; body: SpecialistFixedEventInput}>({
            query: ({id, body}) => ({url: `/admin/schedule/events/${id}`, method: "PUT", body}),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"},
                {type: "ScheduleAvailability", id: "EVENTS"}
	            ]
	        }),
        deleteSpecialistEvent: build.mutation<void, number>({
            query: (id) => ({url: `/admin/schedule/events/${id}`, method: "DELETE"}),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"},
                {type: "ScheduleAvailability", id: "EVENTS"}
            ]
        }),
	        copyDayPlan: build.mutation<DayPlanCopyResponse, DayPlanCopyInput>({
	            query: (body) => ({url: "/admin/schedule/day-copy", method: "POST", body}),
	            invalidatesTags: [
	                {type: "ScheduleAvailability", id: "LIST"},
	                {type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"},
	                {type: "ScheduleAvailability", id: "EVENTS"}
	            ]
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
    useGetScheduleConfigQuery,
    useListFittingOptionsQuery,
    useCancelFixedEventEnrollmentMutation,
    useCreateSpecialistEventMutation,
    useDeleteAvailabilityMutation,
    useDeleteSpecialistEventMutation,
    useEnrollFixedEventMutation,
    useListPublicAvailabilityQuery,
    useListPublicEventsQuery,
    useListMyFixedEventEnrollmentsQuery,
    useListPublicUnavailableQuery,
    useListAvailabilityQuery,
    useListSpecialistEventEnrollmentsQuery,
    useListSpecialistEventsQuery,
    useUpdateAvailabilityMutation,
    useUpdateSpecialistEventMutation
} = scheduleApi;
