import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {PublicTrainingSession, TrainingEnrollment, TrainingSession, TrainingSessionInput, TrainingSessionStatus, TrainingType, TrainingTypeInput} from "@/types/training";
import type {Locale} from "@/i18n";

type SessionRange = {
    from: string;
    to: string;
    trainingTypeId?: number;
    trainerId?: number;
    officeId?: number;
    status?: TrainingSessionStatus;
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
        enrollTrainingSession: build.mutation<TrainingEnrollment, {id: number; lang: Locale; reminderOptIn: boolean; membershipPurchaseId?: number | null; loyaltyVoucherId?: number | null; promoCode?: string | null}>({
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
    useCreateTrainingTypeMutation,
    useUpdateTrainingTypeMutation,
    useListTrainingSessionsQuery,
    useCreateTrainingSessionMutation,
    useUpdateTrainingSessionMutation,
    useListPublicTrainingSessionsQuery,
    useEnrollTrainingSessionMutation,
    useCancelTrainingSessionMutation
} = trainingApi;
