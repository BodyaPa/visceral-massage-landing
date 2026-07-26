import {createApi} from "@reduxjs/toolkit/query/react";
import {baseQuery} from "@/shared/api/baseQuery";
import type {WorkScheduleEntry, WorkScheduleEntryInput} from "@/types/workSchedule";

export const workScheduleApi = createApi({
    reducerPath: "workScheduleApi", baseQuery, tagTypes: ["WorkSchedule"],
    endpoints: (build) => ({
        listWorkSchedule: build.query<WorkScheduleEntry[], {from: string; to: string; specialistId?: number | ""; officeId?: number | ""}>({
            query: ({from, to, specialistId, officeId}) => {
                const params = new URLSearchParams({from, to});
                if (specialistId) params.set("specialistId", String(specialistId));
                if (officeId) params.set("officeId", String(officeId));
                return `/admin/work-schedules?${params}`;
            }, providesTags: ["WorkSchedule"]
        }),
        createWorkSchedule: build.mutation<WorkScheduleEntry, WorkScheduleEntryInput>({
            query: (body) => ({url: "/admin/work-schedules", method: "POST", body}), invalidatesTags: ["WorkSchedule"]
        }),
        previewWorkSchedule: build.mutation<{bookingConflict: boolean; trainingSessionConflict: boolean; hasConflicts: boolean}, WorkScheduleEntryInput>({
            query: (body) => ({url: "/admin/work-schedules/preview", method: "POST", body})
        }),
        updateWorkSchedule: build.mutation<WorkScheduleEntry, {id: number; body: WorkScheduleEntryInput}>({
            query: ({id, body}) => ({url: `/admin/work-schedules/${id}`, method: "PUT", body}), invalidatesTags: ["WorkSchedule"]
        }),
        deleteWorkSchedule: build.mutation<void, number>({
            query: (id) => ({url: `/admin/work-schedules/${id}`, method: "DELETE"}), invalidatesTags: ["WorkSchedule"]
        }),
        bulkCopyWorkSchedule: build.mutation<WorkScheduleEntry[], {specialistId: number; sourceDate: string; targetDate: string}>({
            query: (body) => ({url: "/admin/work-schedules/bulk-copy", method: "POST", body}), invalidatesTags: ["WorkSchedule"]
        })
    })
});
export const {useListWorkScheduleQuery, useCreateWorkScheduleMutation, usePreviewWorkScheduleMutation, useUpdateWorkScheduleMutation, useDeleteWorkScheduleMutation, useBulkCopyWorkScheduleMutation} = workScheduleApi;
