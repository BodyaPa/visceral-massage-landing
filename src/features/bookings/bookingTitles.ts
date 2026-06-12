import type {Locale} from "@/i18n";

export type BookingServiceTitle = {
    serviceTitleUa: string;
    serviceTitleEn?: string | null;
};

export function bookingServiceTitle(booking: BookingServiceTitle, locale: Locale | string) {
    if (locale === "en" && booking.serviceTitleEn?.trim()) {
        return booking.serviceTitleEn;
    }
    return booking.serviceTitleUa;
}
