import {requireAdmin} from "@/features/auth/auth.server";

export const dynamic = "force-dynamic";

export default async function Page() {
    await requireAdmin();

    return <div>NewsEditor</div>;
}
