import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {
    PublicFixedEvent,
    PublicScheduleAvailabilityBlock,
    PublicScheduleUnavailableBlock,
    SpecialistFixedEvent,
    SpecialistFixedEventEnrollment,
    SpecialistFixedEventInput,
    SpecialistAvailabilityBlock,
    SpecialistAvailabilityInput
} from "@/types/schedule";
import type {Locale} from "@/i18n";

type ListAvailabilityArgs = {
    from: string;
    to: string;
};

type ListPublicAvailabilityArgs = ListAvailabilityArgs & {
    officeId?: number | "";
    serviceId?: number | "";
    specialistId?: number | "";
};

type ListPublicEventsArgs = ListPublicAvailabilityArgs & {
    lang: Locale;
};

export const scheduleApi = createApi({
    reducerPath: "scheduleApi",
    baseQuery,
    tagTypes: ["ScheduleAvailability"],
    endpoints: (build) => ({
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
        listMyFixedEventEnrollments: build.query<PublicFixedEvent[], ListAvailabilityArgs & {lang: Locale}>({
            query: ({from, to, lang}) => {
                const params = new URLSearchParams({from, to, lang});
                return `/schedule/events/my?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "MY_EVENTS"}]
        }),
        enrollFixedEvent: build.mutation<PublicFixedEvent, {id: number; lang: Locale; reminderOptIn: boolean}>({
            query: ({id, lang, reminderOptIn}) => ({
                url: `/schedule/events/${id}/enroll?lang=${lang}`,
                method: "POST",
                body: {reminderOptIn}
            }),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "EVENTS"},
                {type: "ScheduleAvailability", id: "MY_EVENTS"},
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENT_ENROLLMENTS"}
            ]
        }),
        cancelFixedEventEnrollment: build.mutation<PublicFixedEvent, {id: number; lang: Locale}>({
            query: ({id, lang}) => ({
                url: `/schedule/events/${id}/cancel?lang=${lang}`,
                method: "POST"
            }),
            invalidatesTags: [
                {type: "ScheduleAvailability", id: "EVENTS"},
                {type: "ScheduleAvailability", id: "MY_EVENTS"},
                {type: "ScheduleAvailability", id: "SPECIALIST_EVENT_ENROLLMENTS"}
            ]
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
        listSpecialistEvents: build.query<SpecialistFixedEvent[], ListAvailabilityArgs>({
            query: ({from, to}) => {
                const params = new URLSearchParams({from, to});
                return `/admin/schedule/events?${params.toString()}`;
            },
            providesTags: [{type: "ScheduleAvailability", id: "SPECIALIST_EVENTS"}]
        }),
        listSpecialistEventEnrollments: build.query<SpecialistFixedEventEnrollment[], ListAvailabilityArgs>({
            query: ({from, to}) => {
                const params = new URLSearchParams({from, to});
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
    useCreateAvailabilityMutation,
    useCancelFixedEventEnrollmentMutation,
    useCreateSpecialistEventMutation,
    useDeleteAvailabilityMutation,
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
