import type {PublicFixedEvent, PublicScheduleAvailabilityBlock} from "@/types/schedule";
import type {PublicService} from "@/types/services";

export type BookingModeFilter = "all" | "individual" | "events";
export type StatusFilter = "all" | "available" | "unavailable" | "events" | "mine";

export type FilterState = {
    officeId: number | "";
    specialistId: number | "";
    mode: BookingModeFilter;
    status: StatusFilter;
    period: 7 | 31;
};

export type SelectedDayItem =
    | {type: "slot"; startsAt: string; slot: PublicScheduleAvailabilityBlock}
    | {type: "event"; startsAt: string; event: PublicFixedEvent};

export type SpecialistOption = {id: number; name: string; avatarMediaUrl: string | null};

export type MonthPickerDay = {
    day: number;
    inCurrentMonth: boolean;
    key: string;
};

export function buildMonthRange(date: Date) {
    const from = firstDayOfMonth(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    return {from: from.toISOString(), to: to.toISOString()};
}

export function startOfWeek(date: Date) {
    const monday = new Date(date);
    const day = monday.getDay();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    return monday;
}

export function firstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

export function addMonths(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
    return next;
}

export function buildMonthPickerDays(date: Date): MonthPickerDay[] {
    const first = firstDayOfMonth(date);
    const start = startOfWeek(first);
    const days: MonthPickerDay[] = [];

    for (let index = 0; index < 42; index += 1) {
        const current = new Date(start);
        current.setDate(start.getDate() + index);
        days.push({
            day: current.getDate(),
            inCurrentMonth: current.getMonth() === first.getMonth(),
            key: dateKey(current)
        });
    }

    return days;
}

export function filterScheduleEvents(events: PublicFixedEvent[], filters: FilterState) {
    if (filters.mode === "individual" || filters.status === "available" || filters.status === "unavailable") return [];
    if (filters.status === "mine") return events.filter((event) => event.enrolled);
    if (filters.status === "events") return events.filter((event) => !event.full);
    return events;
}

export function uniqueSpecialists(items: Array<{specialistId: number; specialistName: string; specialistAvatarMediaUrl?: string | null}>): SpecialistOption[] {
    const specialists = new Map<number, SpecialistOption>();
    for (const item of items) {
        specialists.set(item.specialistId, {
            id: item.specialistId,
            name: item.specialistName,
            avatarMediaUrl: item.specialistAvatarMediaUrl ?? specialists.get(item.specialistId)?.avatarMediaUrl ?? null
        });
    }
    return Array.from(specialists.values());
}

export function slotKey(slot: PublicScheduleAvailabilityBlock) {
    return `slot-${slot.id}-${slot.startsAt}`;
}

export function serviceDurationSlot(slot: PublicScheduleAvailabilityBlock, service: PublicService): PublicScheduleAvailabilityBlock | null {
    const startsAt = new Date(slot.startsAt);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + service.durationMinutes);
    if (endsAt.getTime() > new Date(slot.endsAt).getTime()) return null;
    return {...slot, endsAt: endsAt.toISOString()};
}

export function buildSelectedDayItems(slots: PublicScheduleAvailabilityBlock[], events: PublicFixedEvent[]): SelectedDayItem[] {
    return [
        ...slots.map((slot) => ({type: "slot" as const, startsAt: slot.startsAt, slot})),
        ...events.map((event) => ({type: "event" as const, startsAt: event.startsAt, event}))
    ].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

export function toId(value: string): number | "" {
    return value ? Number(value) : "";
}

export function dateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
