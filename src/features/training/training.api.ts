import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {TrainingSession, TrainingSessionInput, TrainingSessionStatus, TrainingType, TrainingTypeInput} from "@/types/training";

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
        })
    })
});

export const {
    useListTrainingTypesQuery,
    useCreateTrainingTypeMutation,
    useUpdateTrainingTypeMutation,
    useListTrainingSessionsQuery,
    useCreateTrainingSessionMutation,
    useUpdateTrainingSessionMutation
} = trainingApi;
