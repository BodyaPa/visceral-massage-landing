"use client";

import {useMemo} from "react";
import {Calendar, dayjsLocalizer, type DateRange, type Event, type EventProps, type Formats, type Messages, type View, Views} from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/uk";
import "dayjs/locale/en";

const localizer = dayjsLocalizer(dayjs);

export type AtaraksiaCalendarEvent = Event & {
    id: string;
    badge?: string;
    meta?: string;
    tone: "available" | "blocked" | "booking" | "event" | "buffer" | "past" | "cancelled";
};
export type AtaraksiaCalendarMessages = Messages<AtaraksiaCalendarEvent>;

type Props = {
    culture: string;
    date: Date;
    events: AtaraksiaCalendarEvent[];
    messages: AtaraksiaCalendarMessages;
    onNavigate?: (date: Date) => void;
    onSelectEvent?: (event: AtaraksiaCalendarEvent) => void;
    variant?: "booking" | "planner";
    view: View;
};

export default function AtaraksiaCalendar({culture, date, events, messages, onNavigate, onSelectEvent, variant = "planner", view}: Props) {
    const languageTag = culture === "uk" || culture === "ua" ? "uk-UA" : "en-US";
    const formats = useMemo(() => calendarFormats(languageTag), [languageTag]);
    const components = useMemo(() => ({event: CalendarEventContent}), []);
    const heightClass = view === Views.AGENDA
        ? "h-[440px] sm:h-[520px]"
        : variant === "booking"
        ? "h-[500px] sm:h-[600px]"
        : "h-[620px] sm:h-[760px]";

    return (
        <div className={`ataraksia-calendar-scroll ataraksia-calendar-${variant}`}>
            <div className={`ataraksia-calendar min-w-[720px] md:min-w-0 ${heightClass}`}>
            <Calendar<AtaraksiaCalendarEvent>
                components={components}
                culture={culture}
                date={date}
                dayLayoutAlgorithm="no-overlap"
                endAccessor="end"
                eventPropGetter={(event) => ({className: `ataraksia-calendar-event ataraksia-calendar-event-${event.tone}`})}
                events={events}
                formats={formats}
                localizer={localizer}
                messages={messages}
                onNavigate={onNavigate}
                onSelectEvent={onSelectEvent}
                startAccessor="start"
                toolbar={false}
                view={view}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            />
            </div>
        </div>
    );
}

function CalendarEventContent({event, title}: EventProps<AtaraksiaCalendarEvent>) {
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
