import type {Locale} from "@/i18n";
import {requireAnyRole} from "@/features/auth/auth.server";
import NeedsCompletionWorkspace from "@/features/bookings/NeedsCompletionWorkspace";

type Props = {
    params: Promise<{lang: string}>;
};

export default async function Page({params}: Props) {
    const {lang} = await params;
    await requireAnyRole(["ADMIN"], lang as Locale);

    return <NeedsCompletionWorkspace />;
}
