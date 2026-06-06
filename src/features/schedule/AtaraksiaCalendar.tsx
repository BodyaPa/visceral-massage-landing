"use client";

import {useMemo} from "react";
import {Calendar, dayjsLocalizer, type DateRange, type Event, type Formats, type Messages, type View, Views} from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/uk";
import "dayjs/locale/en";

const localizer = dayjsLocalizer(dayjs);

export type AtaraksiaCalendarEvent = Event & {
    id: string;
    tone: "available" | "blocked" | "booking";
};

type Props = {
    culture: string;
    date: Date;
    events: AtaraksiaCalendarEvent[];
    onNavigate?: (date: Date) => void;
    onSelectEvent?: (event: AtaraksiaCalendarEvent) => void;
    view: View;
};

export default function AtaraksiaCalendar({culture, date, events, onNavigate, onSelectEvent, view}: Props) {
    const languageTag = culture === "uk" || culture === "ua" ? "uk-UA" : "en-US";
    const messages = useMemo(() => calendarMessages(languageTag), [languageTag]);
    const formats = useMemo(() => calendarFormats(languageTag), [languageTag]);
    const heightClass = view === Views.AGENDA ? "h-[440px] sm:h-[520px]" : "h-[520px] sm:h-[620px]";

    return (
        <div className={`ataraksia-calendar min-w-0 ${heightClass}`}>
            <Calendar<AtaraksiaCalendarEvent>
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
    );
}

export function toCalendarView(view: "month" | "week" | "day" | "list"): View {
    return view === "list" ? Views.AGENDA : view;
}

function calendarMessages(languageTag: string): Messages<AtaraksiaCalendarEvent> {
    const ua = languageTag.startsWith("uk");

    return {
        agenda: ua ? "Список" : "List",
        allDay: ua ? "Весь день" : "All day",
        date: ua ? "Дата" : "Date",
        day: ua ? "День" : "Day",
        event: ua ? "Подія" : "Event",
        month: ua ? "Місяць" : "Month",
        next: ua ? "Далі" : "Next",
        noEventsInRange: ua ? "Немає подій у цьому діапазоні." : "No events in this range.",
        previous: ua ? "Назад" : "Back",
        showMore: (count) => ua ? `+ ще ${count}` : `+ ${count} more`,
        time: ua ? "Час" : "Time",
        today: ua ? "Сьогодні" : "Today",
        tomorrow: ua ? "Завтра" : "Tomorrow",
        week: ua ? "Тиждень" : "Week",
        work_week: ua ? "Робочий тиждень" : "Work week",
        yesterday: ua ? "Вчора" : "Yesterday"
    };
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
