import {requireRole} from "@/features/auth/auth.server";
import BookingRegistry from "@/features/bookings/BookingRegistry";
import type {Locale} from "@/i18n";

export default async function Page({params}: {params: Promise<{lang: string}>}) {
    const {lang} = await params;
    await requireRole("ADMIN", lang as Locale);
    return <BookingRegistry />;
}
