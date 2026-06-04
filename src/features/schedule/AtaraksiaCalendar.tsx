"use client";

import {Calendar, dayjsLocalizer, type Event, type View, Views} from "react-big-calendar";
import dayjs from "dayjs";

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
    return (
        <div className="ataraksia-calendar h-[620px] min-w-0">
            <Calendar<AtaraksiaCalendarEvent>
                culture={culture}
                date={date}
                dayLayoutAlgorithm="no-overlap"
                endAccessor="end"
                eventPropGetter={(event) => ({className: `ataraksia-calendar-event ataraksia-calendar-event-${event.tone}`})}
                events={events}
                localizer={localizer}
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
