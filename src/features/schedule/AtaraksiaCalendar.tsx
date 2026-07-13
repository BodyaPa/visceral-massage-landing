"use client";

import {useEffect, useMemo, useState} from "react";
import {Calendar, dayjsLocalizer, type DateRange, type Event, type EventProps, type Formats, type Messages, type View, Views} from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/uk";
import "dayjs/locale/en";

const localizer = dayjsLocalizer(dayjs);

export type AtaraksiaCalendarEvent = Omit<Event, "end" | "start"> & {
    id: string;
    badge?: string;
    end: Date;
    meta?: string;
    start: Date;
    tone: "available" | "blocked" | "booking" | "event" | "buffer" | "past" | "cancelled";
};
export type AtaraksiaCalendarMessages = Messages<AtaraksiaCalendarEvent>;

type Props = {
    culture: string;
    date: Date;
    events: AtaraksiaCalendarEvent[];
    max?: Date;
    messages: AtaraksiaCalendarMessages;
    min?: Date;
    onNavigate?: (date: Date) => void;
    onSelectEvent?: (event: AtaraksiaCalendarEvent) => void;
    variant?: "booking" | "planner" | "preview";
    view: View;
};

export default function AtaraksiaCalendar({culture, date, events, max, messages, min, onNavigate, onSelectEvent, variant = "planner", view}: Props) {
    const languageTag = culture === "uk" || culture === "ua" ? "uk-UA" : "en-US";
    const formats = useMemo(() => calendarFormats(languageTag), [languageTag]);
    const components = useMemo(() => ({event: CalendarEventContent}), []);
    const [expandedDate, setExpandedDate] = useState<Date | null>(null);
    const heightClass = view === Views.AGENDA
        ? "h-[440px] sm:h-[520px]"
        : variant === "preview"
        ? "h-[360px] sm:h-[430px]"
        : variant === "booking"
        ? "h-[500px] sm:h-[600px]"
        : "h-[620px] sm:h-[760px]";
    const expandedEvents = useMemo(() => {
        if (!expandedDate) return [];

        return events
            .filter((event) => eventOverlapsDay(event, expandedDate))
            .sort((first, second) => first.start.getTime() - second.start.getTime());
    }, [events, expandedDate]);

    useEffect(() => {
        setExpandedDate(null);
    }, [date, view]);

    useEffect(() => {
        if (expandedDate && expandedEvents.length === 0) {
            setExpandedDate(null);
        }
    }, [expandedDate, expandedEvents.length]);

    return (
        <>
            <div className={`ataraksia-calendar-scroll ataraksia-calendar-${variant}`}>
                <div className={`ataraksia-calendar min-w-[720px] md:min-w-0 ${heightClass}`}>
                <Calendar<AtaraksiaCalendarEvent>
                    components={components}
                    culture={culture}
                    date={date}
                    dayLayoutAlgorithm="no-overlap"
                    doShowMoreDrillDown={false}
                    endAccessor="end"
                    eventPropGetter={(event) => ({className: `ataraksia-calendar-event ataraksia-calendar-event-${event.tone}`})}
                    events={events}
                    formats={formats}
                    localizer={localizer}
                    max={max}
                    messages={messages}
                    min={min}
                    onNavigate={onNavigate}
                    onSelectEvent={onSelectEvent}
                    onShowMore={(_, day) => setExpandedDate(day)}
                    popup={false}
                    startAccessor="start"
                    toolbar={false}
                    view={view}
                    views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                />
                </div>
            </div>
            {expandedDate ? (
                <section className="mt-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <h3 className="min-w-0 break-words text-sm font-semibold text-stone-950">
                            {formatDate(expandedDate, languageTag, {day: "numeric", month: "long", weekday: "long"})}
                        </h3>
                        <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100" onClick={() => setExpandedDate(null)} type="button">
                            x
                        </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {expandedEvents.map((event) => (
                            <button
                                className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-2 text-left transition-colors hover:border-stone-400 hover:bg-white"
                                key={event.id}
                                onClick={() => onSelectEvent?.(event)}
                                type="button"
                            >
                                <CalendarEventLabel event={event} title={String(event.title ?? "")} />
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}
        </>
    );
}

function CalendarEventContent({event, title}: EventProps<AtaraksiaCalendarEvent>) {
    return <CalendarEventLabel event={event} title={title} />;
}

function CalendarEventLabel({event, title}: {event: AtaraksiaCalendarEvent; title: string}) {
    return (
        <span className="ataraksia-calendar-event-content" title={[event.badge, title, event.meta].filter(Boolean).join(" · ")}>
            {event.badge ? <span className="ataraksia-calendar-event-badge">{event.badge}</span> : null}
            <span className="ataraksia-calendar-event-title">{title}</span>
            {event.meta ? <span className="ataraksia-calendar-event-meta">{event.meta}</span> : null}
        </span>
    );
}

export function toCalendarView(view: "month" | "week" | "day" | "list"): View {
    return view === "list" ? Views.AGENDA : view;
}

function calendarFormats(languageTag: string): Formats {
    return {
        agendaDateFormat: (date) => formatDate(date, languageTag, {day: "numeric", month: "short", weekday: "short"}),
        agendaHeaderFormat: (range) => formatRange(range, languageTag, {day: "numeric", month: "short"}),
        agendaTimeFormat: (date) => formatDate(date, languageTag, {hour: "2-digit", minute: "2-digit"}),
        agendaTimeRangeFormat: (range) => formatTimeRange(range, languageTag),
        dateFormat: (date) => formatDate(date, languageTag, {day: "numeric"}),
        dayFormat: (date) => formatDate(date, languageTag, {day: "numeric", month: "short", weekday: "short"}),
        dayHeaderFormat: (date) => formatDate(date, languageTag, {day: "numeric", month: "long", weekday: "long"}),
        dayRangeHeaderFormat: (range) => formatRange(range, languageTag, {day: "numeric", month: "short"}),
        eventTimeRangeFormat: (range) => formatTimeRange(range, languageTag),
        eventTimeRangeEndFormat: (range) => formatTimeRange(range, languageTag),
        eventTimeRangeStartFormat: (range) => formatTimeRange(range, languageTag),
        monthHeaderFormat: (date) => formatDate(date, languageTag, {month: "long", year: "numeric"}),
        selectRangeFormat: (range) => formatTimeRange(range, languageTag),
        timeGutterFormat: (date) => formatDate(date, languageTag, {hour: "2-digit", minute: "2-digit"}),
        weekdayFormat: (date) => formatDate(date, languageTag, {weekday: "short"})
    };
}

function formatRange(range: DateRange, languageTag: string, options: Intl.DateTimeFormatOptions) {
    return `${formatDate(range.start, languageTag, options)} - ${formatDate(range.end, languageTag, options)}`;
}

function formatTimeRange(range: DateRange, languageTag: string) {
    return `${formatDate(range.start, languageTag, {hour: "2-digit", minute: "2-digit"})} - ${formatDate(range.end, languageTag, {hour: "2-digit", minute: "2-digit"})}`;
}

function formatDate(date: Date, languageTag: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(languageTag, options).format(date);
}

function eventOverlapsDay(event: AtaraksiaCalendarEvent, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return event.start < dayEnd && event.end > dayStart;
}
