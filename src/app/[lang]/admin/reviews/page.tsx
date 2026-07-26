import ReviewsManagement from "@/features/reviews/ReviewsManagement";
import {requireRole} from "@/features/auth/auth.server";
import type {Locale} from "@/i18n";

export default async function AdminReviewsPage({params}: {params: Promise<{lang: string}>}) {
    const {lang} = await params;
    const locale = lang as Locale;
    await requireRole("ADMIN", locale);
    return <ReviewsManagement locale={locale} />;
}
