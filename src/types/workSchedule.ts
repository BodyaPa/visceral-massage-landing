export type WorkScheduleEntryType = "WORKING" | "DAY_OFF" | "VACATION" | "ABSENCE";
export type WorkScheduleEntry = {
    id: number; specialistId: number; specialistName: string; entryType: WorkScheduleEntryType;
    officeId: number | null; officeName: string | null; resourceId: number | null; resourceName: string | null;
    startsAt: string; endsAt: string; notes: string | null; createdAt: string; updatedAt: string;
};
export type WorkScheduleEntryInput = Omit<WorkScheduleEntry, "id" | "specialistName" | "officeName" | "resourceName" | "createdAt" | "updatedAt">;
