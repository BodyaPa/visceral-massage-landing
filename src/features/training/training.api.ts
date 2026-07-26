import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {AccountTrainingParticipation, AdminTrainingRecord, CalendarTrainingParticipant, PublicTrainingSession, TrainingEnrollment, TrainingParticipantStatus, TrainingSession, TrainingSessionInput, TrainingSessionStatus, TrainingType, TrainingTypeInput} from "@/types/training";
import type {Locale} from "@/i18n";
import type {PageResponse} from "@/types/news";
import type {RecordAuditEntry} from "@/types/bookings";

type SessionRange = {
    from: string;
    to: string;
    trainingTypeId?: number;
    trainerId?: number;
    officeId?: number;
    status?: TrainingSessionStatus;
};

export type TrainingRegistryArgs = {
    participantStatus?: TrainingParticipantStatus | "";
    sessionStatus?: TrainingSessionStatus | "";
    query?: string;
    visitFrom?: string;
    visitTo?: string;
    page?: number;
    size?: number;
    officeId?: number | "";
    resourceId?: number | "";
    trainerId?: number | "";
    trainingTypeId?: number | "";
    sort?: "trainingSession.startsAt,desc" | "trainingSession.startsAt,asc" | "createdAt,desc" | "createdAt,asc";
};

export const trainingApi = createApi({
    reducerPath: "trainingApi",
    baseQuery,
    tagTypes: ["TrainingTypes", "TrainingSessions"],
    endpoints: (build) => ({
        listTrainingTypes: build.query<TrainingType[], void>({
            query: () => "/admin/training/types",
            providesTags: ["TrainingTypes"]
        }),
        listAdminTrainingRecords: build.query<PageResponse<AdminTrainingRecord>, TrainingRegistryArgs>({
            query: ({participantStatus, sessionStatus, query, visitFrom, visitTo, officeId, resourceId, trainerId, trainingTypeId, sort = "trainingSession.startsAt,desc", page = 0, size = 25}) => {
                const params = new URLSearchParams({page: String(page), size: String(size), sort});
                if (participantStatus) params.set("participantStatus", participantStatus);
                if (sessionStatus) params.set("sessionStatus", sessionStatus);
                if (query?.trim()) params.set("query", query.trim());
                if (visitFrom) params.set("visitFrom", visitFrom);
                if (visitTo) params.set("visitTo", visitTo);
                if (officeId) params.set("officeId", String(officeId));
                if (resourceId) params.set("resourceId", String(resourceId));
                if (trainerId) params.set("trainerId", String(trainerId));
                if (trainingTypeId) params.set("trainingTypeId", String(trainingTypeId));
                return `/admin/records/training?${params.toString()}`;
            },
            providesTags: ["TrainingSessions"]
        }),
        getAdminTrainingTimeline: build.query<RecordAuditEntry[], number>({
            query: (id) => `/admin/records/training/${id}/timeline`
        }),
        setTrainingAttendance: build.mutation<void, {id: number; status: "ATTENDED" | "NO_SHOW"}>({
            query: ({id, status}) => ({
                url: `/admin/records/training/${id}/attendance?status=${status}`,
                method: "POST"
            }),
            invalidatesTags: ["TrainingSessions"]
        }),
        createTrainingType: build.mutation<TrainingType, TrainingTypeInput>({
            query: (body) => ({url: "/admin/training/types", method: "POST", body}),
            invalidatesTags: ["TrainingTypes"]
        }),
        updateTrainingType: build.mutation<TrainingType, {id: number; body: TrainingTypeInput}>({
            query: ({id, body}) => ({url: `/admin/training/types/${id}`, method: "PUT", body}),
            invalidatesTags: ["TrainingTypes"]
        }),
        listTrainingSessions: build.query<TrainingSession[], SessionRange>({
            query: (args) => {
                const params = new URLSearchParams({from: args.from, to: args.to});
                if (args.trainingTypeId) params.set("trainingTypeId", String(args.trainingTypeId));
                if (args.trainerId) params.set("trainerId", String(args.trainerId));
                if (args.officeId) params.set("officeId", String(args.officeId));
                if (args.status) params.set("status", args.status);
                return `/admin/training/sessions?${params.toString()}`;
            },
            providesTags: ["TrainingSessions"]
        }),
        listCalendarTrainingParticipants: build.query<CalendarTrainingParticipant[], SessionRange & {participantStatus?: TrainingParticipantStatus}>({
            query: ({from, to, trainerId, officeId, trainingTypeId, participantStatus}) => {
                const params = new URLSearchParams({from, to});
                if (trainerId) params.set("trainerId", String(trainerId));
                if (officeId) params.set("officeId", String(officeId));
                if (trainingTypeId) params.set("trainingTypeId", String(trainingTypeId));
                if (participantStatus) params.set("status", participantStatus);
                return `/admin/training/sessions/participants?${params.toString()}`;
            },
            providesTags: ["TrainingSessions"]
        }),
        createTrainingSession: build.mutation<TrainingSession, TrainingSessionInput>({
            query: (body) => ({url: "/admin/training/sessions", method: "POST", body}),
            invalidatesTags: ["TrainingSessions"]
        }),
        updateTrainingSession: build.mutation<TrainingSession, {id: number; body: TrainingSessionInput}>({
            query: ({id, body}) => ({url: `/admin/training/sessions/${id}`, method: "PUT", body}),
            invalidatesTags: ["TrainingSessions"]
        }),
        listPublicTrainingSessions: build.query<PublicTrainingSession[], {from: string; to: string; officeId?: number | ""; trainerId?: number | ""; lang: Locale}>({
            query: ({from, to, officeId, trainerId, lang}) => {
                const params = new URLSearchParams({from, to, lang});
                if (officeId) params.set("officeId", String(officeId));
                if (trainerId) params.set("trainerId", String(trainerId));
                return `/training/sessions?${params.toString()}`;
            },
            providesTags: ["TrainingSessions"]
        }),
        listMyTrainingParticipations: build.query<PageResponse<AccountTrainingParticipation>, {from: string; to: string; lang: Locale; page?: number; size?: number}>({
            query: ({from, to, lang, page = 0, size = 20}) => {
                const params = new URLSearchParams({from, to, lang, page: String(page), size: String(size), sort: "trainingSession.startsAt,desc"});
                return `/training/sessions/mine?${params.toString()}`;
            },
            providesTags: ["TrainingSessions"]
        }),
        enrollTrainingSession: build.mutation<TrainingEnrollment, {id: number; lang: Locale; reminderOptIn: boolean; membershipPurchaseId?: number | null; loyaltyVoucherId?: number | null; promoCode?: string | null; cancellationPolicyAccepted: boolean}>({
            query: ({id, lang, ...body}) => ({url: `/training/sessions/${id}/enroll?lang=${lang}`, method: "POST", body}),
            invalidatesTags: ["TrainingSessions"]
        }),
        cancelTrainingSession: build.mutation<TrainingEnrollment, {id: number; lang: Locale; reason: string; details?: string | null}>({
            query: ({id, lang, ...body}) => ({url: `/training/sessions/${id}/cancel?lang=${lang}`, method: "POST", body}),
            invalidatesTags: ["TrainingSessions"]
        })
    })
});

export const {
    useListTrainingTypesQuery,
    useListAdminTrainingRecordsQuery,
    useGetAdminTrainingTimelineQuery,
    useSetTrainingAttendanceMutation,
    useCreateTrainingTypeMutation,
    useUpdateTrainingTypeMutation,
    useListTrainingSessionsQuery,
    useListCalendarTrainingParticipantsQuery,
    useCreateTrainingSessionMutation,
    useUpdateTrainingSessionMutation,
    useListPublicTrainingSessionsQuery,
    useListMyTrainingParticipationsQuery,
    useEnrollTrainingSessionMutation,
    useCancelTrainingSessionMutation
} = trainingApi;
